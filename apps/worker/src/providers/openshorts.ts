/**
 * Integrates the existing OpenShorts MIT-core AI Shorts pipeline as a separate
 * private service. Vidi owns billing and private output storage; OpenShorts
 * owns the external model orchestration. Never run this in a serverless route.
 *
 * Upstream REST contract: mutonby/openshorts app.py /api/saasshorts/*.
 */
import { HeadObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { db } from '@vidi/db';
import { buildOpenShortsScript } from '@vidi/core';
import type { ProjectInput } from '@vidi/core';

const MAX_BYTES = 100 * 1024 * 1024;
const JOB_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SUBMITTING = 'SUBMITTING';
const sleep = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds));

function configuration() {
  const required = ['OPENSHORTS_API_URL', 'OPENSHORTS_SERVICE_TOKEN',
    'OPENSHORTS_FAL_KEY', 'OPENSHORTS_ELEVENLABS_KEY', 'S3_BUCKET'] as const;
  for (const key of required)
    if (!process.env[key]) throw new Error('Missing OpenShorts configuration: ' + key);
  const base = new URL(process.env.OPENSHORTS_API_URL!);
  if (base.protocol !== 'https:' || base.username || base.password ||
      base.search || base.hash || base.pathname !== '/')
    throw new Error('OPENSHORTS_API_URL must be an HTTPS origin');
  return {
    base, serviceToken: process.env.OPENSHORTS_SERVICE_TOKEN!,
    falKey: process.env.OPENSHORTS_FAL_KEY!,
    elevenKey: process.env.OPENSHORTS_ELEVENLABS_KEY!,
  };
}

function client() {
  return new S3Client({
    region: process.env.S3_REGION || process.env.AWS_REGION || 'auto',
    endpoint: process.env.S3_ENDPOINT || process.env.AWS_ENDPOINT_URL_S3,
    forcePathStyle: !!(process.env.S3_ENDPOINT || process.env.AWS_ENDPOINT_URL_S3),
    requestChecksumCalculation: 'WHEN_REQUIRED',
  });
}

async function upstream(
  base: URL,
  token: string,
  path: string,
  options: RequestInit = {},
  timeout = 30000,
) {
  const url = new URL(path, base);
  if (url.origin !== base.origin) throw new Error('OpenShorts URL changed origin');
  const response = await fetch(url, {
    ...options, redirect: 'error',
    headers: { Authorization: 'Bearer ' + token, ...options.headers },
    signal: AbortSignal.timeout(timeout),
    cache: 'no-store',
  });
  return response;
}

async function providerJobId(renderId: string, project: ProjectInput, config: ReturnType<typeof configuration>) {
  const current = await db.render.findUniqueOrThrow({
    where: { id: renderId }, select: { providerJobId: true },
  });
  if (current.providerJobId === SUBMITTING)
    throw new Error('OpenShorts submission uncertain: reconcile provider job before retrying');
  if (current.providerJobId) {
    if (!JOB_ID.test(current.providerJobId)) throw new Error('Invalid persisted OpenShorts job ID');
    return current.providerJobId;
  }
  // Durable reservation: if the worker dies during POST we refuse to submit a
  // second paid task automatically. Manual reconciliation is documented.
  const locked = await db.render.updateMany({
    where: { id: renderId, status: 'PROCESSING', providerJobId: null },
    data: { providerJobId: SUBMITTING },
  });
  if (!locked.count) throw new Error('OpenShorts task already reserved by another worker');

  const response = await upstream(config.base, config.serviceToken,
    '/api/saasshorts/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Fal-Key': config.falKey,
        'X-ElevenLabs-Key': config.elevenKey,
      },
      body: JSON.stringify({
        script: buildOpenShortsScript(project),
        voice_id: process.env.OPENSHORTS_VOICE_ID || undefined,
        video_mode: 'lowcost',
        share_to_gallery: false,
      }),
    }, 120000);

  if (!response.ok) {
    // OpenShorts validates synchronously on 4xx; this is safe to reset.
    // A 5xx/timeout could have started a paid job: keep SUBMITTING.
    if (response.status >= 400 && response.status < 500)
      await db.render.updateMany({
        where: { id: renderId, providerJobId: SUBMITTING },
        data: { providerJobId: null },
      });
    throw new Error('OpenShorts generate returned HTTP ' + response.status);
  }
  const payload = await response.json() as { job_id?: unknown };
  if (typeof payload.job_id !== 'string' || !JOB_ID.test(payload.job_id))
    throw new Error('OpenShorts returned no valid job ID; manual reconciliation required');
  await db.render.updateMany({
    where: { id: renderId, providerJobId: SUBMITTING },
    data: { providerJobId: payload.job_id },
  });
  return payload.job_id;
}

async function waitForVideo(jobId: string, config: ReturnType<typeof configuration>) {
  for (let attempt = 0; attempt < 180; attempt++) {
    const response = await upstream(config.base, config.serviceToken,
      '/api/saasshorts/status/' + jobId);
    if (!response.ok) throw new Error('OpenShorts status returned HTTP ' + response.status);
    const task = await response.json() as {
      status?: string; result?: { video_url?: string };
    };
    if (task.status === 'completed') {
      if (!task.result?.video_url) throw new Error('OpenShorts completed without video');
      return task.result.video_url;
    }
    if (task.status === 'failed') throw new Error('OpenShorts generation failed');
    if (task.status !== 'processing') throw new Error('Unexpected OpenShorts task status');
    await sleep(5000);
  }
  throw new Error('OpenShorts render exceeded 15-minute poll window');
}

async function cappedVideo(response: Response) {
  if (!response.ok) throw new Error('OpenShorts video download returned HTTP ' + response.status);
  if (Number(response.headers.get('content-length') || 0) > MAX_BYTES)
    throw new Error('OpenShorts output too large');
  if (!response.body) throw new Error('OpenShorts video response has no body');
  const reader = response.body.getReader();
  const buffers: Buffer[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BYTES) throw new Error('OpenShorts output too large');
      buffers.push(Buffer.from(value));
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = Buffer.concat(buffers);
  if (bytes.length < 2048 || bytes.toString('ascii', 4, 8) !== 'ftyp')
    throw new Error('OpenShorts response is not an MP4');
  return bytes;
}

export async function createOpenShortsRender(
  renderId: string, workspaceId: string, project: ProjectInput,
) {
  const config = configuration();
  const storage = client();
  const bucket = process.env.S3_BUCKET!;
  const key = `${workspaceId}/generated/${renderId}.mp4`;
  try {
    try {
      const old = await storage.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
      if (old.ContentType === 'video/mp4' && old.ContentLength &&
          old.ContentLength <= MAX_BYTES)
        return { key, mime: 'video/mp4', size: old.ContentLength, workspaceId,
          name: 'Vidi UGC OpenShorts.mp4', confirmedAt: new Date() };
    } catch (error) {
      if ((error as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode !== 404)
        throw error;
    }
    const id = await providerJobId(renderId, project, config);
    const videoPath = await waitForVideo(id, config);
    // The status URL is untrusted upstream data. Accept ONLY this job's output
    // path from the exact configured origin; no redirects or arbitrary hosts.
    if (!videoPath.startsWith('/videos/saas_' + id + '/'))
      throw new Error('Untrusted OpenShorts video path');
    const url = new URL(videoPath, config.base);
    if (url.origin !== config.base.origin || url.search || url.hash ||
        !/^\/videos\/saas_[0-9a-f-]{36}\/[a-zA-Z0-9_.-]+\.mp4$/i.test(url.pathname))
      throw new Error('Invalid OpenShorts media URL');
    const response = await upstream(config.base, config.serviceToken, url.pathname, {}, 180000);
    const bytes = await cappedVideo(response);
    const used = await db.asset.aggregate({ where: { workspaceId }, _sum: { size: true } });
    if ((used._sum.size || 0) + bytes.length > 1024 * 1024 * 1024)
      throw new Error('Workspace storage quota exceeded');
    await storage.send(new PutObjectCommand({
      Bucket: bucket, Key: key, Body: bytes, ContentType: 'video/mp4',
    }));
    return { key, mime: 'video/mp4', size: bytes.length, workspaceId,
      name: 'Vidi UGC OpenShorts.mp4', confirmedAt: new Date() };
  } finally {
    storage.destroy();
  }
}
