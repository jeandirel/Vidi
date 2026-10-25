import { Worker, type ConnectionOptions } from 'bullmq';
import { db } from '@vidi/db';
import { executeMedia, lockVoiceConsent } from './media';
export function createVoiceWorker(connection: ConnectionOptions, native: boolean) {
  const worker = new Worker<{ generationId: string }>(
    'vidi-voices',
    async (job) => {
      const generation = await db.voiceGeneration.findUniqueOrThrow({
        where: { id: job.data.generationId },
      });
      if (['COMPLETED', 'FAILED'].includes(generation.status)) return;
      try {
        if (!native) throw new Error('Native voice gateway is not configured');
        await db.voiceGeneration.update({
          where: { id: generation.id },
          data: { status: 'PROCESSING' },
        });
        const output = await executeMedia(generation.id, generation.workspaceId, generation);
        await db.$transaction(async (tx) => {
          await lockVoiceConsent(tx, generation.profileId, generation.workspaceId);
          const asset = await tx.asset.upsert({
            where: { key: output.key },
            create: output,
            update: output,
          });
          await tx.voiceGeneration.update({
            where: { id: generation.id },
            data: { status: 'COMPLETED', outputAssetId: asset.id },
          });
        });
      } catch (error) {
        if (job.attemptsMade + 1 >= (job.opts.attempts || 1))
          await db.voiceGeneration.updateMany({
            where: { id: generation.id, status: { in: ['QUEUED', 'PROCESSING'] } },
            data: { status: 'FAILED' },
          });
        throw error;
      }
    },
    { connection, concurrency: 1 },
  );
  worker.on('error', () => console.error('Voice worker unavailable'));
  worker.on('failed', (job) =>
    console.error('Voice attempt failed', { generationId: job?.data.generationId }),
  );
  return worker;
}
