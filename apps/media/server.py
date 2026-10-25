"""Authenticated, single-process media gateway. Persist /data on a durable volume."""
from concurrent.futures import ThreadPoolExecutor
from contextlib import asynccontextmanager, contextmanager
import hashlib
import hmac
import json
import os
from pathlib import Path
import shutil
import sqlite3
import threading
import time
from typing import Literal
from fastapi import FastAPI, Depends, Header, HTTPException, Request
from pydantic import BaseModel, ConfigDict, Field, ValidationError, model_validator
from pipeline import capabilities, compose, synthesize, transfer, seconds, load_tts

os.umask(0o077)
ROOT = Path(os.environ.get('MEDIA_DATA_DIR', '/data')).resolve()
ROOT.mkdir(parents=True, exist_ok=True, mode=0o700)
POOL = ThreadPoolExecutor(max_workers=1)
LOCK = threading.Lock()

@contextmanager
def database():
    db = sqlite3.connect(ROOT / 'jobs.sqlite', timeout=30)
    db.row_factory = sqlite3.Row
    db.execute('PRAGMA journal_mode=WAL')
    db.execute('CREATE TABLE IF NOT EXISTS jobs (id TEXT PRIMARY KEY, digest TEXT NOT NULL, status TEXT NOT NULL, payload TEXT, updated REAL NOT NULL)')
    try:
        with db:
            yield db
    finally:
        db.close()

class Script(BaseModel):
    hook: str = Field(min_length=1, max_length=400)
    body: str = Field(min_length=1, max_length=2400)
    cta: str = Field(min_length=1, max_length=300)
class Product(BaseModel):
    image: str = Field(default='', max_length=1500000)
class Media(BaseModel):
    kind: Literal['product','avatar'] = 'product'
    narration: Literal['none','standard','clone'] = 'none'
    voiceProfileId: str | None = Field(default=None, max_length=100)
class Project(BaseModel):
    script: Script
    product: Product
    duration: Literal[15,30,60]
    resolution: Literal['720p','1080p','4k']
    language: Literal['fr','en','es','de','pt']
    emotion: Literal['warm','energetic','calm']
    avatarId: Literal['lea','marcus','maya','alex','ines','kenji']
    voiceId: Literal['claire','noah','amina','james']
    captions: bool
    media: Media = Field(default_factory=Media)
class Job(BaseModel):
    model_config = ConfigDict(extra='forbid')
    id: str = Field(pattern=r'^[A-Za-z0-9_-]{1,100}$')
    kind: Literal['video','voice']
    project: Project | None = None
    text: str | None = Field(default=None, min_length=2, max_length=1000)
    language: Literal['fr','en','es','de','pt'] = 'fr'
    emotion: Literal['warm','energetic','calm'] = 'warm'
    referenceUrl: str | None = Field(default=None, max_length=12000)
    uploadUrl: str = Field(max_length=12000)
    @model_validator(mode='after')
    def valid_job(self):
        if self.kind == 'video' and self.project is None: raise ValueError('project_required')
        if self.kind == 'voice' and (not self.text or not self.referenceUrl): raise ValueError('voice_input_required')
        if self.project and self.project.media.narration == 'clone' and not self.referenceUrl: raise ValueError('voice_reference_required')
        if self.project and self.project.media.kind == 'avatar' and self.project.media.narration == 'none': raise ValueError('avatar_requires_audio')
        return self

def execute(job_id):
    work = ROOT / 'work' / job_id
    try:
        with database() as db:
            row = db.execute('SELECT * FROM jobs WHERE id=?', (job_id,)).fetchone()
            if not row or row['status'] != 'QUEUED': return
            db.execute("UPDATE jobs SET status='PROCESSING',updated=? WHERE id=?", (time.time(),job_id))
        job = Job.model_validate_json(row['payload'])
        work.mkdir(parents=True, exist_ok=True, mode=0o700)
        reference = None
        if job.referenceUrl:
            reference = work / 'reference.audio'
            transfer(job.referenceUrl, destination=reference)
            if not 5 <= seconds(reference) <= 30: raise ValueError('reference_duration_5_to_30_seconds')
        if job.kind == 'video':
            output = compose(job.project.model_dump(), work, reference)
            mime = 'video/mp4'
        else:
            output = work / 'voice.wav'
            synthesize(job.text, job.language, job.emotion, output, reference)
            mime = 'audio/wav'
        transfer(job.uploadUrl, upload=output, mime=mime)
        with database() as db:
            db.execute("UPDATE jobs SET status='COMPLETED',payload=NULL,updated=? WHERE id=?", (time.time(),job_id))
    except Exception:
        # No exception body: it may contain signed transfer URLs or input text.
        with database() as db:
            db.execute("UPDATE jobs SET status='FAILED',payload=NULL,updated=? WHERE id=?", (time.time(),job_id))
    finally:
        shutil.rmtree(work, ignore_errors=True)

@asynccontextmanager
async def lifespan(app):
    if os.environ.get("MEDIA_ENABLE_TTS") == "true": load_tts()
    with database() as db:
        # An interrupted generation is retried with the same durable ID and output object key.
        db.execute("UPDATE jobs SET status='QUEUED' WHERE status='PROCESSING' AND payload IS NOT NULL")
        rows = db.execute("SELECT id FROM jobs WHERE status='QUEUED'").fetchall()
    for row in rows: POOL.submit(execute, row['id'])
    yield
    POOL.shutdown(wait=True)

app = FastAPI(lifespan=lifespan, docs_url=None, redoc_url=None, openapi_url=None)

def authorized(authorization: str | None = Header(default=None)):
    token = os.environ.get('MEDIA_GATEWAY_TOKEN', '')
    if len(token) < 32: raise HTTPException(503, 'Gateway credential not configured')
    if not authorization or not hmac.compare_digest(authorization.encode(), ('Bearer ' + token).encode()):
        raise HTTPException(401, 'Unauthorized')

@app.get('/health', dependencies=[Depends(authorized)])
def health(): return capabilities()

@app.post('/jobs', dependencies=[Depends(authorized)], status_code=202)
async def submit(request: Request):
    data = bytearray()
    async for chunk in request.stream():
        data.extend(chunk)
        if len(data) > 2000000: raise HTTPException(413, 'Request too large')
    try: job = Job.model_validate_json(data)
    except ValidationError: raise HTTPException(400, 'Invalid media request') from None
    content = job.model_dump(exclude={'uploadUrl','referenceUrl'})
    digest = hashlib.sha256(json.dumps(content, sort_keys=True).encode()).hexdigest()
    with LOCK, database() as db:
        previous = db.execute('SELECT * FROM jobs WHERE id=?', (job.id,)).fetchone()
        if previous:
            if previous['digest'] != digest: raise HTTPException(409, 'Idempotency conflict')
            # Terminal failures do not silently rerun expensive inference.
            return {'status': previous['status']}
        pending = db.execute("SELECT count(*) FROM jobs WHERE status IN ('QUEUED','PROCESSING')").fetchone()[0]
        if pending >= 5: raise HTTPException(503, 'Media queue full')
        db.execute('INSERT INTO jobs VALUES (?,?,?,?,?)', (job.id, digest, 'QUEUED', job.model_dump_json(), time.time()))
    POOL.submit(execute, job.id)
    return {'status': 'QUEUED'}

@app.get('/jobs/{job_id}', dependencies=[Depends(authorized)])
def status(job_id: str):
    with database() as db:
        row = db.execute('SELECT status FROM jobs WHERE id=?', (job_id,)).fetchone()
    if not row: raise HTTPException(404, 'Unknown job')
    return {'status': row['status']}
