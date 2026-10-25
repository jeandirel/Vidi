import { z } from 'zod';
import { db } from '@vidi/db';
import { requireWorkspace } from '@/lib/auth';
import { ApiError, checkOrigin, errorResponse, jsonBody } from '@/lib/api';
import { mediaConfigured, mediaCapabilities } from '@/lib/media-config';
import { rateLimit } from '@/lib/rate-limit';
import { voiceQueue } from '@/lib/queue';
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const input = z
      .object({
        workspaceId: z.string(),
        profileId: z.string(),
        text: z.string().trim().min(2).max(1000),
        language: z.enum(['fr', 'en', 'es', 'de', 'pt']),
        emotion: z.enum(['warm', 'energetic', 'calm']),
        idempotencyKey: z.string().uuid(),
      })
      .parse(await jsonBody(request));
    const workspace = await requireWorkspace(input.workspaceId, true);
    const previous = await db.voiceGeneration.findUnique({
      where: {
        workspaceId_idempotencyKey: {
          workspaceId: input.workspaceId,
          idempotencyKey: input.idempotencyKey,
        },
      },
    });
    if (previous) {
      if (
        previous.profileId !== input.profileId ||
        previous.text !== input.text ||
        previous.language !== input.language ||
        previous.emotion !== input.emotion
      )
        throw new ApiError(409, 'Cette clé désigne une autre synthèse.');
      return Response.json({ id: previous.id, status: previous.status });
    }
    if (!mediaConfigured())
      throw new ApiError(503, 'Le moteur vocal privé n’est pas encore connecté.');
    if (!(await mediaCapabilities())?.tts)
      throw new ApiError(503, 'Le modèle de clonage vocal n’est pas chargé sur le serveur.');
    if (!['pro', 'agency'].includes(workspace.plan))
      throw new ApiError(
        403,
        'La synthèse avec voix clonée nécessite une offre Pro ou Agency active.',
      );
    const profile = await db.voiceProfile.findFirst({
      where: {
        id: input.profileId,
        workspaceId: input.workspaceId,
        revokedAt: null,
        sourceAssetId: { not: null },
      },
    });
    if (!profile) throw new ApiError(404, 'Voix introuvable ou autorisation révoquée.');
    await rateLimit(`voice:${workspace.id}`, 3, 60);
    await rateLimit(`voice-day:${workspace.id}`, 10, 86400);
    const job = await db.voiceGeneration.upsert({
      where: {
        workspaceId_idempotencyKey: {
          workspaceId: input.workspaceId,
          idempotencyKey: input.idempotencyKey,
        },
      },
      create: { ...input },
      update: {},
    });
    if (
      job.profileId !== input.profileId ||
      job.text !== input.text ||
      job.language !== input.language ||
      job.emotion !== input.emotion
    )
      throw new ApiError(409, 'Cette clé désigne une autre synthèse.');
    // Recovery from a Redis outage is handled by the worker reconciliation loop.
    const queue = voiceQueue();
    let dispatchPending = false;
    try {
      await queue.add('voice', { generationId: job.id }, { jobId: job.id });
    } catch {
      dispatchPending = true;
    } finally {
      await queue.close();
    }
    return Response.json({ id: job.id, status: job.status, dispatchPending }, { status: 202 });
  } catch (e) {
    return errorResponse(e);
  }
}
