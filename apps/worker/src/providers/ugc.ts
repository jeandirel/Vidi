/**
 * UGC pipeline: real model output -> deterministic FFmpeg edit -> private S3 asset.
 * Runs ONLY inside the durable BullMQ worker, never in a Vercel request.
 * Provider calls are paid; a render ID reuses an already-uploaded output on retry.
 */
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { execFile } from 'node:child_process';
import { HeadObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import type { ProjectInput } from '@vidi/core';
import { db } from '@vidi/db';
import { productImage } from '../image';
import { generateHeyGenVideo } from './heygen';

const exec = promisify(execFile);
const MAX_VIDEO_BYTES = 70 * 1024 * 1024;
const GOOGLE_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/interactions';
const renderSizes: Record<ProjectInput['aspectRatio'], [number, number]> = {
  '9:16': [720, 1280], '1:1': [720, 720], '16:9': [1280, 720],
};

function storage() {
  if (!process.env.S3_BUCKET) throw new Error('S3_BUCKET required for AI UGC exports');
  const client = new S3Client({
    region: process.env.S3_REGION || process.env.AWS_REGION || 'auto',
    endpoint: process.env.S3_ENDPOINT || process.env.AWS_ENDPOINT_URL_S3,
    forcePathStyle: !!(process.env.S3_ENDPOINT || process.env.AWS_ENDPOINT_URL_S3),
    requestChecksumCalculation: 'WHEN_REQUIRED',
  });
  return { client, bucket: process.env.S3_BUCKET };
}

function narration(project: ProjectInput) {
  return [project.script.hook, project.script.body, project.script.cta].filter(Boolean).join(' ');
}

function scenePrompt(project: ProjectInput) {
  const benefits = project.product.benefits.filter(Boolean).slice(0, 5).join('; ');
  return [
    'Create ONE realistic 6-10 second cinematic vertical UGC product B-roll shot.',
    'Natural handheld camera, real-world lighting, premium social-media advertising aesthetic.',
    'A person casually demonstrating the object in a believable everyday setting.',
    'Avoid text overlays, logos, invented price labels, testimonials, medical claims or added packaging.',
    'Preserve the uploaded reference product appearance as closely as possible.',
    'If the object cannot be depicted faithfully, show only a lifestyle background; the editor will insert the original photograph.',
    'Product name: ' + project.product.name,
    'Verified description: ' + project.product.description.slice(0, 900),
    'Verified benefits (do not invent more): ' + benefits,
    'Audience: ' + project.product.audience.slice(0, 250),
  ].join('\n');
}

async function googleScene(project: ProjectInput, imageData: string): Promise<Buffer> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY missing');
  const ref = /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/=]+)$/.exec(imageData);
  const input: unknown = ref
    ? [
        { type: 'image', data: ref[2], mime_type: 'image/' + ref[1] },
        { type: 'text', text: scenePrompt(project) },
      ]
    : scenePrompt(project);
  const responseFormat = {
    type: 'video', aspect_ratio: project.aspectRatio === '16:9' ? '16:9' : '9:16',
    resolution: '720p',
  };
  async function call(url: string, init?: RequestInit) {
    const res = await fetch(url, {
      ...init,
      headers: { 'x-goog-api-key': apiKey!, 'Content-Type': 'application/json', ...init?.headers },
      redirect: 'error',
      signal: AbortSignal.timeout(180000),
    });
    if (!res.ok) throw new Error('Google video API returned HTTP ' + res.status);
    return res.json() as Promise<{
      id?: string; status?: string; output_video?: { data?: string };
      error?: { message?: string };
    }>;
  }
  let result = await call(GOOGLE_ENDPOINT, {
    method: 'POST',
    body: JSON.stringify({
      model: process.env.GEMINI_VIDEO_MODEL || 'gemini-omni-1.1-flash',
      input,
      response_format: responseFormat,
    }),
  });
  for (let attempt = 0; result.status === 'in_progress' && attempt < 90; attempt++) {
    if (!result.id || !/^[a-zA-Z0-9_-]+$/.test(result.id)) throw new Error('Invalid Gemini interaction ID');
    await new Promise((resolve) => setTimeout(resolve, 8000));
    result = await call(GOOGLE_ENDPOINT + '/' + encodeURIComponent(result.id));
  }
  if (result.status === 'failed' || result.status === 'cancelled')
    throw new Error('Google video generation failed');
  const encoded = result.output_video?.data;
  if (!encoded || encoded.length > MAX_VIDEO_BYTES * 1.4)
    throw new Error('Google did not return a supported inline video');
  const bytes = Buffer.from(encoded, 'base64');
  if (!bytes.length || bytes.length > MAX_VIDEO_BYTES) throw new Error('Invalid Google video output size');
  return bytes;
}

async function elevenVoice(text: string): Promise<Buffer | null> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  const voiceId = process.env.ELEVENLABS_VOICE_ID;
  if (!apiKey || !voiceId) return null;
  if (!/^[a-zA-Z0-9]{8,40}$/.test(voiceId)) throw new Error('Invalid ElevenLabs voice ID');
  const response = await fetch(
    'https://api.elevenlabs.io/v1/text-to-speech/' + voiceId + '?output_format=mp3_44100_128',
    {
      method: 'POST',
      headers: { 'xi-api-key': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, model_id: process.env.ELEVENLABS_MODEL || 'eleven_multilingual_v2' }),
      redirect: 'error', signal: AbortSignal.timeout(120000),
    },
  );
  if (!response.ok) throw new Error('ElevenLabs TTS returned HTTP ' + response.status);
  const size = Number(response.headers.get('content-length') || 0);
  if (size > 20 * 1024 * 1024) throw new Error('TTS response too large');
  const bytes = Buffer.from(await response.arrayBuffer());
  if (!bytes.length || bytes.length > 20 * 1024 * 1024) throw new Error('Invalid TTS response');
  return bytes;
}

async function trustedHeygenVideo(urlString: string) {
  const url = new URL(urlString);
  const hosts = new Set([
    'resource.heygen.ai', 'resource2.heygen.ai', 'files.heygen.ai', 'heygen.ai',
    ...(process.env.VIDEO_OUTPUT_HOSTS || '').split(',').map((v) => v.trim()).filter(Boolean),
  ]);
  if (url.protocol !== 'https:' || url.username || url.password || !hosts.has(url.hostname))
    throw new Error('Untrusted HeyGen video host; configure VIDEO_OUTPUT_HOSTS');
  const response = await fetch(url, { redirect: 'error', signal: AbortSignal.timeout(120000) });
  if (!response.ok) throw new Error('HeyGen video download failed');
  if (Number(response.headers.get('content-length') || 0) > MAX_VIDEO_BYTES)
    throw new Error('HeyGen video too large');
  const bytes = Buffer.from(await response.arrayBuffer());
  if (!bytes.length || bytes.length > MAX_VIDEO_BYTES) throw new Error('HeyGen video too large');
  return bytes;
}

function stamp(seconds: number) {
  const ms = Math.round(seconds * 1000);
  return new Date(ms).toISOString().slice(11, 23).replace('.', ',');
}
async function writeCaptions(project: ProjectInput, output: string) {
  const texts = [project.script.hook, project.script.body, project.script.cta].filter(Boolean);
  const weights = texts.map((text) => Math.max(1, text.split(/\s+/).length));
  const weightTotal = weights.reduce((a, b) => a + b, 0);
  let start = 0;
  const blocks = texts.map((text, i) => {
    const end = i === texts.length - 1 ? project.duration : start + project.duration * weights[i] / weightTotal;
    const caption = `${i + 1}\n${stamp(start)} --> ${stamp(end)}\n${text.replace(/[<>]/g, '').slice(0, 500)}\n`;
    start = end;
    return caption;
  });
  await writeFile(output, blocks.join('\n'), 'utf8');
}

function videoFilter(project: ProjectInput, avatar: boolean, hasImage: boolean, captions: string) {
  const [width, height] = renderSizes[project.aspectRatio];
  const normal = `scale=${width}:${height}:force_original_aspect_ratio=increase,crop=${width}:${height},setsar=1,fps=30`;
  const chain: string[] = [`[0:v]${normal}[base]`];
  let current = 'base';
  if (avatar) {
    const offset = Math.max(2, Math.min(12, Math.floor(project.duration * 0.45)));
    chain.push(`[1:v]${normal},setpts=PTS-STARTPTS+${offset}/TB[broll]`);
    chain.push(`[${current}][broll]overlay=0:0:eof_action=pass:enable='between(t,${offset},${offset + 5})'[mix]`);
    current = 'mix';
  }
  if (hasImage) {
    const index = avatar ? 2 : 1 + Number(!!process.env.ELEVENLABS_API_KEY && !!process.env.ELEVENLABS_VOICE_ID);
    chain.push(`[${index}:v]scale=${Math.floor(width * 0.34)}:-1,format=rgba[product]`);
    chain.push(`[${current}][product]overlay=W-w-24:24:enable='gte(t,${Math.max(0, project.duration - 5)})'[productmix]`);
    current = 'productmix';
  }
  if (!avatar && project.captions) {
    // Absolute temp path is generated by mkdtemp and contains no untrusted characters.
    chain.push(`[${current}]subtitles=${captions}[outv]`);
  } else {
    chain.push(`[${current}]format=yuv420p[outv]`);
  }
  return chain.join(';');
}

export async function createUgcRender(
  id: string,
  workspaceId: string,
  project: ProjectInput,
) {
  const { client, bucket } = storage();
  const key = `${workspaceId}/generated/${id}.mp4`;
  try {
    const old = await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    if (old.ContentType === 'video/mp4' && old.ContentLength && old.ContentLength <= 100 * 1024 * 1024)
      return { key, mime: 'video/mp4', size: old.ContentLength, workspaceId,
        name: 'Vidi UGC.mp4', confirmedAt: new Date() };
  } catch (error) {
    if ((error as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode !== 404)
      throw error;
  }
  const folder = await mkdtemp(join(tmpdir(), 'vidi-ugc-'));
  try {
    const avatar = project.media?.kind === 'avatar' && !!process.env.HEYGEN_API_KEY;
    const validImage = project.product.image ? await productImage(project.product.image) : '';
    const match = /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/=]+)$/.exec(validImage);
    const image = match ? Buffer.from(match[2], 'base64') : null;
    if (image && image.length > 1024 * 1024) throw new Error('Product image exceeds limit');
    const clip = await googleScene(project, validImage);
    const broll = join(folder, 'scene.mp4');
    await writeFile(broll, clip);
    const main = join(folder, 'avatar.mp4');
    if (avatar) {
      const heygen = await generateHeyGenVideo({ project, apiKey: process.env.HEYGEN_API_KEY! });
      await writeFile(main, await trustedHeygenVideo(heygen.videoUrl));
    }
    const audio = !avatar ? await elevenVoice(narration(project)) : null;
    const audioFile = join(folder, 'narration.mp3');
    if (audio) await writeFile(audioFile, audio);
    const imageFile = join(folder, match?.[1] === 'png' ? 'product.png' : 'product.jpg');
    if (image) await writeFile(imageFile, image);
    const srt = join(folder, 'captions.srt');
    await writeCaptions(project, srt);
    const inputs = avatar
      ? ['-i', main, '-i', broll]
      : ['-stream_loop', '-1', '-i', broll, ...(audio ? ['-i', audioFile] : [])];
    if (image) inputs.push('-loop', '1', '-i', imageFile);
    const output = join(folder, 'output.mp4');
    await exec('ffmpeg', [
      '-hide_banner', '-loglevel', 'error', '-y', ...inputs,
      '-filter_complex', videoFilter(project, avatar, !!image, srt),
      '-map', '[outv]', '-map', avatar ? '0:a?' : audio ? '1:a' : '0:a?',
      '-t', String(project.duration), '-c:v', 'libx264', '-preset', 'veryfast',
      '-crf', '23', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '128k',
      '-movflags', '+faststart', output,
    ], { timeout: 600000, maxBuffer: 1024 * 1024 });
    const mp4 = await readFile(output);
    if (mp4.length < 2048 || mp4.length > 100 * 1024 * 1024)
      throw new Error('Invalid MP4 output');
    const used = await db.asset.aggregate({ where: { workspaceId }, _sum: { size: true } });
    if ((used._sum.size || 0) + mp4.length > 1024 * 1024 * 1024)
      throw new Error('Workspace storage quota exceeded');
    await client.send(new PutObjectCommand({
      Bucket: bucket, Key: key, Body: mp4, ContentType: 'video/mp4',
    }));
    return { key, mime: 'video/mp4', size: mp4.length, workspaceId,
      name: 'Vidi UGC.mp4', confirmedAt: new Date() };
  } finally {
    await rm(folder, { recursive: true, force: true });
    client.destroy();
  }
}
