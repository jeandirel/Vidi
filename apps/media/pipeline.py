"""Actual FFmpeg composition and optional local Chatterbox / MuseTalk inference."""
import base64
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import textwrap
import urllib.request
from urllib.parse import urlparse
from PIL import Image

Image.MAX_IMAGE_PIXELS = 12_000_000

def run(args, cwd=None, timeout=600):
    result = subprocess.run(args, cwd=cwd, timeout=timeout, stdout=subprocess.DEVNULL,
                            stderr=subprocess.PIPE, check=False)
    if result.returncode:
        raise RuntimeError("media_process_failed")

def transfer(url, destination=None, upload=None, mime=None):
    parsed = urlparse(url)
    allowed = {h.strip() for h in os.environ.get('MEDIA_TRANSFER_HOSTS', '').split(',') if h.strip()}
    if parsed.scheme != 'https' or parsed.hostname not in allowed or parsed.username or parsed.password or parsed.port not in (None, 443):
        raise ValueError('transfer_host_not_allowed')
    class NoRedirect(urllib.request.HTTPRedirectHandler):
        def redirect_request(self, *args):
            return None
    opener = urllib.request.build_opener(NoRedirect)
    if upload:
        if upload.stat().st_size > 100 * 1024 * 1024:
            raise ValueError('output_too_large')
        # Generated files are bounded before loading them for the signed PUT.
        req = urllib.request.Request(url, upload.read_bytes(), {'Content-Type': mime}, method='PUT')
        with opener.open(req, timeout=120) as response:
            if response.status not in (200, 201, 204):
                raise RuntimeError('upload_failed')
    else:
        with opener.open(url, timeout=60) as response, destination.open('wb') as output:
            total = 0
            while chunk := response.read(65536):
                total += len(chunk)
                if total > 10 * 1024 * 1024:
                    raise ValueError('reference_too_large')
                output.write(chunk)

def seconds(file):
    raw = subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'json', str(file)], timeout=30)
    return float(json.loads(raw)['format']['duration'])

def subtitle_time(value):
    millis = int(round(value * 1000))
    return f'{millis // 3600000:02}:{millis // 60000 % 60:02}:{millis // 1000 % 60:02},{millis % 1000:03}'

def subtitles(script, duration, path):
    parts = [script[k] for k in ('hook', 'body', 'cta')]
    # This is planned pacing, not word-level forced alignment.
    pieces = [chunk for part in parts for chunk in textwrap.wrap(part, 80)]
    weights = [max(1, len(p.split())) for p in pieces]
    total = sum(weights)
    blocks, start = [], 0.0
    for i, (text, weight) in enumerate(zip(pieces, weights)):
        end = duration if i == len(pieces) - 1 else start + duration * weight / total
        clean = text.translate(str.maketrans({'<': '‹', '>': '›', '{': '｛', '}': '｝', '\\': '＼'}))
        blocks.append(f'{i+1}\n{subtitle_time(start)} --> {subtitle_time(end)}\n{textwrap.fill(clean, 36)}\n')
        start = end
    path.write_text('\n'.join(blocks), encoding='utf-8')

def load_tts():
    if os.environ.get('MEDIA_ENABLE_TTS') != 'true':
        raise RuntimeError('tts_not_enabled')
    from chatterbox.mtl_tts import ChatterboxMultilingualTTS
    global _tts
    if '_tts' not in globals():
        _tts = ChatterboxMultilingualTTS.from_pretrained(device=os.environ.get('MEDIA_DEVICE', 'cuda'))
    return _tts

def synthesize(text, language, emotion, destination, reference=None, voice_id='claire'):
    model = load_tts()
    import torch
    import torchaudio
    sample = reference
    if sample is None:
        library = Path(os.environ.get('MEDIA_VOICE_LIBRARY', '/models/voices')).resolve()
        candidate = (library / f'{voice_id}.wav').resolve()
        if candidate.parent != library or not candidate.is_file():
            raise RuntimeError('standard_voice_not_installed')
        sample = candidate
    kwargs = {'language_id': language, 'audio_prompt_path': str(sample), 'exaggeration': {'energetic': .7, 'calm': .3, 'warm': .5}[emotion]}
    with torch.inference_mode():
        wav = model.generate(text, **kwargs)
    torchaudio.save(str(destination), wav, model.sr)
    if seconds(destination) > 120:
        raise ValueError('voice_too_long')

def animate(avatar_id, audio, work):
    root = Path(os.environ.get('MUSETALK_ROOT', '/models/musetalk')).resolve()
    library = Path(os.environ.get('MEDIA_ACTOR_LIBRARY', '/models/actors')).resolve()
    actor = (library / f'{avatar_id}.mp4').resolve()
    if actor.parent != library or not actor.is_file() or not (root / 'scripts/inference.py').is_file():
        raise RuntimeError('avatar_engine_or_actor_not_installed')
    config = work / 'musetalk.json'
    config.write_text(json.dumps({'vidi': {'video_path': str(actor), 'audio_path': str(audio), 'bbox_shift': 0}}))
    output = work / 'animated'
    run([os.environ.get('MUSETALK_PYTHON', '/models/musetalk/.venv/bin/python'), '-m', 'scripts.inference',
         '--inference_config', str(config), '--result_dir', str(output),
         '--unet_model_path', 'models/musetalkV15/unet.pth', '--unet_config', 'models/musetalkV15/musetalk.json', '--version', 'v15'], cwd=root, timeout=1500)
    files = list(output.rglob('*.mp4'))
    if len(files) != 1:
        raise RuntimeError('avatar_output_invalid')
    return files[0]

RESOLUTIONS = {
    '9:16': {'720p': (720, 1280), '1080p': (1080, 1920), '4k': (2160, 3840)},
    '1:1': {'720p': (720, 720), '1080p': (1080, 1080), '4k': (2160, 2160)},
    '16:9': {'720p': (1280, 720), '1080p': (1920, 1080), '4k': (3840, 2160)},
}

SUBTITLE_STYLES = {
    'tiktok-punchy': (
        "FontName=DejaVu Sans,FontSize=24,Bold=1,"
        "PrimaryColour=&H0047E0FD,OutlineColour=&H00000000,BorderStyle=1,Outline=3,MarginV=65,Alignment=2"
    ),
    'boxed-minimal': (
        "FontName=DejaVu Sans,FontSize=18,Bold=0,"
        "PrimaryColour=&H00FFFFFF,OutlineColour=&H990F1118,BorderStyle=3,Outline=2,MarginV=70,Alignment=2"
    ),
    'gradient-pop': (
        "FontName=DejaVu Sans,FontSize=22,Bold=1,"
        "PrimaryColour=&H00F8BD38,OutlineColour=&H00C084FC,BorderStyle=1,Outline=3,MarginV=65,Alignment=2"
    ),
    'classic-white': (
        "FontName=DejaVu Sans,FontSize=20,Bold=0,"
        "PrimaryColour=&H00FFFFFF,OutlineColour=&H00101010,BorderStyle=1,Outline=2,MarginV=70,Alignment=2"
    ),
}

def compose(project, work, reference=None):
    duration = project['duration']
    media = project.get('media') or {'kind': 'product', 'narration': 'none'}
    audio = None
    if media['narration'] == 'clone' and reference is None:
        raise ValueError('clone_requires_reference')
    if media['narration'] != 'none':
        audio = work / 'voice.wav'
        synthesize(' '.join(project['script'].values()), project['language'], project['emotion'], audio,
                   reference=reference, voice_id=project['voiceId'])
        if seconds(audio) > duration + .2:
            raise ValueError('script_audio_exceeds_duration')

    aspect = project.get('aspectRatio', '9:16')
    if aspect not in RESOLUTIONS:
        aspect = '9:16'
    width, height = RESOLUTIONS[aspect][project['resolution']]
    args = ['ffmpeg', '-y', '-hide_banner', '-loglevel', 'error', '-threads', '2']

    product_img_path = None
    image = project.get('product', {}).get('image', '')
    if image:
        if len(image) > 1500000 or not re.fullmatch(r'data:image/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+', image):
            raise ValueError('unsupported_product_image')
        source = work / 'product-source'
        source.write_bytes(base64.b64decode(image.split(',', 1)[1], validate=True))
        with Image.open(source) as opened:
            product_img_path = work / 'product.jpg'
            opened.convert('RGB').save(product_img_path)

    product_clips = [
        c for c in project.get('clips', [])
        if isinstance(c, dict) and c.get('kind') == 'product' and c.get('duration', 0) > 0
    ]
    has_broll_overlay = media['kind'] == 'avatar' and product_clips and product_img_path is not None

    if media['kind'] == 'avatar':
        if audio is None: raise ValueError('avatar_requires_audio')
        video = animate(project['avatarId'], audio, work)
        args += ['-i', str(video)]
        if has_broll_overlay:
            args += ['-loop', '1', '-i', str(product_img_path)]
    else:
        if product_img_path:
            args += ['-loop', '1', '-i', str(product_img_path)]
        else:
            args += ['-f', 'lavfi', '-i', f'color=c=0x17181c:s={width}x{height}:r=25']

    if audio: args += ['-i', str(audio)]

    subtitle_style_key = project.get('subtitleStyle', 'tiktok-punchy')
    sub_style = SUBTITLE_STYLES.get(subtitle_style_key, SUBTITLE_STYLES['tiktok-punchy'])
    destination = work / 'output.mp4'

    if has_broll_overlay:
        between_expr = '+'.join([
            f"between(t,{c['start']:.2f},{(c['start']+c['duration']):.2f})"
            for c in product_clips
        ])
        prod_w = int(width * 0.85)
        prod_h = int(height * 0.85)
        prod_w = prod_w if prod_w % 2 == 0 else prod_w - 1
        prod_h = prod_h if prod_h % 2 == 0 else prod_h - 1
        
        fc = (
            f"[0:v]scale={width}:{height}:force_original_aspect_ratio=decrease,pad={width}:{height}:(ow-iw)/2:(oh-ih)/2,setsar=1,tpad=stop_mode=clone:stop_duration={duration}[avatar];"
            f"[1:v]scale={prod_w}:{prod_h}:force_original_aspect_ratio=decrease,setsar=1[prod];"
            f"[avatar][prod]overlay=(W-w)/2:(H-h)/2:enable='{between_expr}'[vover]"
        )
        if project.get('captions'):
            subtitles(project['script'], duration, work / 'captions.srt')
            fc += f";[vover]subtitles=captions.srt:force_style='{sub_style}'[vout]"
        else:
            fc += f";[vover]null[vout]"

        args += [
            '-filter_complex', fc,
            '-map', '[vout]',
            '-t', str(duration), '-r', '25', '-c:v', 'libx264', '-preset', 'fast', '-crf', '23',
            '-pix_fmt', 'yuv420p', '-threads', '2'
        ]
        args += ['-map', '2:a:0', '-c:a', 'aac'] if audio else ['-an']
    else:
        filters = f'scale={width}:{height}:force_original_aspect_ratio=decrease,pad={width}:{height}:(ow-iw)/2:(oh-ih)/2,setsar=1'
        if media['kind'] == 'avatar':
            filters += f',tpad=stop_mode=clone:stop_duration={duration}'
        if project.get('captions'):
            subtitles(project['script'], duration, work / 'captions.srt')
            filters += f",subtitles=captions.srt:force_style='{sub_style}'"
        args += ['-map', '0:v:0', '-vf', filters, '-t', str(duration), '-r', '25', '-c:v', 'libx264', '-preset', 'fast', '-crf', '23', '-pix_fmt', 'yuv420p', '-threads', '2']
        args += ['-map', '1:a:0', '-c:a', 'aac'] if audio else ['-an']

    args += ['-movflags', '+faststart', str(destination)]
    run(args, cwd=work, timeout=1200)
    return destination

def capabilities():
    root = Path(os.environ.get('MUSETALK_ROOT', '/models/musetalk'))
    actor_root = Path(os.environ.get('MEDIA_ACTOR_LIBRARY', '/models/actors'))
    voice_root = Path(os.environ.get('MEDIA_VOICE_LIBRARY', '/models/voices'))
    actors = [a for a in ['lea','marcus','maya','alex','ines','kenji'] if (actor_root / (a+'.mp4')).is_file()]
    voices = [v for v in ['claire','noah','amina','james'] if (voice_root / (v+'.wav')).is_file()]
    return {'product': bool(shutil.which('ffmpeg')), 'tts': '_tts' in globals(),
            'avatar': bool(actors) and Path(os.environ.get('MUSETALK_PYTHON', '/models/musetalk/.venv/bin/python')).is_file() and (root / 'scripts/inference.py').is_file() and (root / 'models/musetalkV15/unet.pth').is_file(),
            'actors':actors, 'voices':voices}
