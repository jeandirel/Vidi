import { Worker, Queue } from 'bullmq';
import { createHmac } from 'node:crypto';
import { db } from '@vidi/db';
import { projectSchema, signableWebhook } from '@vidi/core';
import { executeMedia, lockVoiceConsent } from './media';
import { createVoiceWorker } from './voices';
import { generateHeyGenVideo } from './providers/heygen';
import { createUgcRender } from './providers/ugc';

const required = ['DATABASE_URL', 'REDIS_URL'] as const;
for (const key of required) if (!process.env[key]) throw new Error(`Missing configuration: ${key}`);
const heygen = !!process.env.HEYGEN_API_KEY;
const omni = !!process.env.GEMINI_API_KEY;
const native = !!(process.env.MEDIA_GATEWAY_URL && process.env.MEDIA_GATEWAY_TOKEN);
if (
  !heygen &&
  !omni &&
  !native &&
  (!process.env.VIDEO_GATEWAY_URL ||
    !process.env.VIDEO_GATEWAY_TOKEN ||
    !process.env.VIDEO_OUTPUT_HOSTS)
)
  throw new Error('Configure HeyGen, a native media gateway or a legacy video gateway.');
const redis = new URL(process.env.REDIS_URL!);
const connection = {
  host: redis.hostname,
  port: Number(redis.port || 6379),
  username: redis.username ? decodeURIComponent(redis.username) : undefined,
  password: redis.password ? decodeURIComponent(redis.password) : undefined,
  db: Number(redis.pathname.slice(1) || 0),
  tls: redis.protocol === 'rediss:' ? {} : undefined,
  maxRetriesPerRequest: null,
};
const gateway = new URL(
  native
    ? process.env.MEDIA_GATEWAY_URL!
    : (process.env.VIDEO_GATEWAY_URL || 'https://api.heygen.com'),
);
if (gateway.protocol !== 'https:') throw new Error('VIDEO_GATEWAY_URL must use HTTPS.');
const queue = new Queue('vidi-renders', { connection });
const notifications = new Queue('vidi-webhooks', { connection });
const voices = new Queue('vidi-voices', { connection });
voices.on('error', () => console.error('Voice dispatcher unavailable'));
queue.on('error', () => console.error('Render dispatcher connection error'));
notifications.on('error', () => console.error('Webhook queue connection error'));
const allowedHosts = [
  'resource2.heygen.ai',
  'resource.heygen.ai',
  'files.heygen.ai',
  'heygen.ai',
  ...(process.env.VIDEO_OUTPUT_HOSTS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
];
async function enqueueNotification(renderId: string) {
  if (process.env.WEBHOOK_URL && process.env.WEBHOOK_SECRET)
    await notifications.add(
      'notify',
      { renderId },
      {
        jobId: renderId,
        attempts: 8,
        backoff: { type: 'exponential', delay: 10000 },
        removeOnComplete: 1000,
        removeOnFail: 1000,
      },
    );
}
async function failAndRefund(id: string) {
  await db.$transaction(async (tx) => {
    const render = await tx.render.findUniqueOrThrow({ where: { id } });
    const changed = await tx.render.updateMany({
      where: { id, status: { in: ['QUEUED', 'PROCESSING'] } },
      data: { status: 'FAILED', error: 'La génération a échoué. Les crédits ont été restitués.' },
    });
    if (!changed.count) return;
    await tx.workspace.update({
      where: { id: render.workspaceId },
      data: { credits: { increment: render.credits } },
    });
    await tx.creditEntry.create({
      data: {
        workspaceId: render.workspaceId,
        renderId: id,
        reason: 'REFUND',
        amount: render.credits,
      },
    });
  });
}
const worker = new Worker<{ renderId: string }>(
  'vidi-renders',
  async (job) => {
    const render = await db.render.findUniqueOrThrow({ where: { id: job.data.renderId } });
    if (render.status === 'COMPLETED' || render.status === 'FAILED') {
      await enqueueNotification(render.id);
      return;
    }
    try {
      const input = projectSchema.parse(render.input);
      await db.render.update({ where: { id: render.id }, data: { status: 'PROCESSING' } });
      if (omni && (input.media?.kind !== 'avatar' || heygen)) {
        const output = await createUgcRender(render.id, render.workspaceId, input);
        const asset = await db.asset.upsert({
          where: { key: output.key }, create: output, update: output,
        });
        await db.render.update({
          where: { id: render.id },
          data: { status: 'COMPLETED', outputAssetId: asset.id, error: null },
        });
      } else if (heygen) {
        const result = await generateHeyGenVideo({
          project: input,
          apiKey: process.env.HEYGEN_API_KEY!,
        });
        const output = new URL(result.videoUrl);
        await db.render.update({
          where: { id: render.id },
          data: { status: 'COMPLETED', outputUrl: output.href, error: null },
        });
      } else if (native) {
        const output = await executeMedia(render.id, render.workspaceId, { project: input });
        await db.$transaction(async (tx) => {
          await lockVoiceConsent(
            tx,
            input.media?.narration === 'clone' ? input.media.voiceProfileId : undefined,
            render.workspaceId,
          );
          const asset = await tx.asset.upsert({
            where: { key: output.key },
            create: output,
            update: output,
          });
          await tx.render.update({
            where: { id: render.id },
            data: { status: 'COMPLETED', outputAssetId: asset.id, error: null },
          });
        });
      } else {
        // The configured gateway MUST honor this idempotency key across retries.
        const response = await fetch(gateway, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${process.env.VIDEO_GATEWAY_TOKEN}`,
            'Content-Type': 'application/json',
            'Idempotency-Key': render.id,
          },
          redirect: 'error',
          signal: AbortSignal.timeout(300000),
          body: JSON.stringify({
            id: render.id,
            workspaceId: render.workspaceId,
            project: { ...input, campaign: undefined },
          }),
        });
        if (!response.ok) throw new Error('Video provider failed');
        const result = (await response.json()) as { videoUrl?: string };
        const output = new URL(result.videoUrl || '');
        if (
          output.protocol !== 'https:' ||
          output.username ||
          output.password ||
          !allowedHosts.includes(output.hostname)
        )
          throw new Error('Untrusted video URL');
        await db.render.update({
          where: { id: render.id },
          data: { status: 'COMPLETED', outputUrl: output.href, error: null },
        });
      }
    } catch (error) {
      if (job.attemptsMade + 1 >= (job.opts.attempts || 1)) await failAndRefund(render.id);
      throw error;
    }
    await enqueueNotification(render.id);
  },
  { connection, concurrency: 2 },
);
const voiceWorker = createVoiceWorker(connection, native);
const webhookWorker = new Worker<{ renderId: string }>(
  'vidi-webhooks',
  async (job) => {
    if (!process.env.WEBHOOK_URL || !process.env.WEBHOOK_SECRET) return;
    const url = new URL(process.env.WEBHOOK_URL);
    if (url.protocol !== 'https:') throw new Error('Webhook must use HTTPS');
    const render = await db.render.findUniqueOrThrow({ where: { id: job.data.renderId } });
    if (!['COMPLETED', 'FAILED'].includes(render.status)) return;
    const body = JSON.stringify({
      id: render.id,
      type: render.status === 'COMPLETED' ? 'render.completed' : 'render.failed',
      workspaceId: render.workspaceId,
      projectId: render.projectId,
      url: render.outputUrl,
      outputAssetId: render.outputAssetId,
      downloadPath: render.outputAssetId ? `/api/renders/${render.id}/download` : null,
    });
    const signature = createHmac('sha256', process.env.WEBHOOK_SECRET)
      .update(signableWebhook(render.id, body))
      .digest('hex');
    const response = await fetch(url, {
      method: 'POST',
      redirect: 'error',
      signal: AbortSignal.timeout(10000),
      headers: {
        'Content-Type': 'application/json',
        'X-Vidi-Event-Id': render.id,
        'X-Vidi-Signature': signature,
      },
      body,
    });
    if (!response.ok) throw new Error('Webhook delivery failed');
  },
  { connection, concurrency: 2 },
);
// Database rows are a durable outbox: a Redis outage after credit reservation does not lose a render.
let dispatching = false;
async function dispatchPending() {
  if (dispatching) return;
  dispatching = true;
  try {
    const voiceRows = await db.voiceGeneration.findMany({
      where: { status: 'QUEUED' },
      take: 100,
      orderBy: { createdAt: 'asc' },
    });
    for (const row of voiceRows)
      await voices.add(
        'voice',
        { generationId: row.id },
        {
          jobId: row.id,
          attempts: 3,
          backoff: { type: 'exponential', delay: 10000 },
          removeOnComplete: 1000,
          removeOnFail: 1000,
        },
      );
    const rows = await db.render.findMany({
      where: { status: 'QUEUED' },
      orderBy: { createdAt: 'asc' },
      take: 100,
    });
    for (const row of rows)
      await queue.add(
        'render',
        { renderId: row.id },
        {
          jobId: row.id,
          attempts: 3,
          backoff: { type: 'exponential', delay: 10000 },
          removeOnComplete: 1000,
          removeOnFail: 1000,
        },
      );
  } catch {
    console.error('Render dispatch unavailable');
  } finally {
    dispatching = false;
  }
}
worker.on('failed', (job) =>
  console.error('Render attempt failed', {
    renderId: job?.data.renderId,
    attempt: job?.attemptsMade,
  }),
);
worker.on('error', () => console.error('Render worker connection error'));
webhookWorker.on('error', () => console.error('Webhook worker connection error'));
webhookWorker.on('failed', (job) =>
  console.error('Webhook delivery failed', { renderId: job?.data.renderId }),
);
await dispatchPending();
const timer = setInterval(() => void dispatchPending(), 10000);
let closing = false;
async function shutdown() {
  if (closing) return;
  closing = true;
  clearInterval(timer);
  await Promise.all([worker.close(), webhookWorker.close(), voiceWorker.close()]);
  await Promise.all([queue.close(), notifications.close(), voices.close()]);
  await db.$disconnect();
}
process.on('SIGTERM', () => void shutdown());
process.on('SIGINT', () => void shutdown());
console.info('Vidi rendering workers ready');
