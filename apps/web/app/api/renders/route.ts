import { z } from 'zod';
import { db, Prisma } from '@vidi/db';
import { canRender, plans, projectSchema, renderCost, type ProjectInput } from '@vidi/core';
import { requireWorkspace } from '@/lib/auth';
import { ApiError, checkOrigin, errorResponse, jsonBody } from '@/lib/api';
import { renderQueue } from '@/lib/queue';
import { mediaConfigured, mediaCapabilities, openShortsConfigured, videoConfigured } from '@/lib/media-config';
import { rateLimit } from '@/lib/rate-limit';
import { localProjects, localRenders, type LocalRender } from '@/lib/local-store';

const schema = z.object({
  workspaceId: z.string().min(1),
  projectId: z.string().min(1),
  idempotencyKey: z.string().uuid(),
});

export async function GET(request: Request) {
  try {
    const workspaceId = new URL(request.url).searchParams.get('workspaceId') || '';
    await requireWorkspace(workspaceId, false, request);

    if (workspaceId === 'ws_local' || !process.env.DATABASE_URL) {
      const all = Array.from(localRenders.values())
        .filter((r) => r.workspaceId === workspaceId)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      return Response.json({ renders: all });
    }

    try {
      const renders = await db.render.findMany({
        where: { workspaceId },
        select: {
          id: true,
          projectId: true,
          status: true,
          credits: true,
          outputUrl: true,
          outputAssetId: true,
          error: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
      });
      return Response.json({ renders });
    } catch {
      const all = Array.from(localRenders.values())
        .filter((r) => r.workspaceId === workspaceId)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      return Response.json({ renders: all });
    }
  } catch (e) {
    return errorResponse(e);
  }
}

export async function POST(request: Request) {
  try {
    checkOrigin(request, true);
    const input = schema.parse(await jsonBody(request));
    const workspace = await requireWorkspace(input.workspaceId, true, request);

    if (workspace.id !== 'ws_local') {
      try {
        await rateLimit(`renders:${workspace.id}`, 10, 60);
      } catch {
        /* rate limiter fallback */
      }
    }

    // Check local idempotency
    const localPrev = Array.from(localRenders.values()).find(
      (r) => r.workspaceId === workspace.id && (r as LocalRender & { idempotencyKey?: string }).idempotencyKey === input.idempotencyKey,
    );
    if (localPrev) return Response.json(localPrev);

    if (process.env.DATABASE_URL && workspace.id !== 'ws_local') {
      try {
        const previous = await db.render.findUnique({
          where: {
            workspaceId_idempotencyKey: {
              workspaceId: workspace.id,
              idempotencyKey: input.idempotencyKey,
            },
          },
        });
        if (previous) {
          if (previous.projectId !== input.projectId)
            throw new ApiError(409, 'Cette clé est déjà associée à un autre projet.');
          return Response.json(previous);
        }
      } catch (err) {
        if (err instanceof ApiError) throw err;
      }
    }

    if (!videoConfigured())
      throw new ApiError(
        503,
        'Le moteur vidéo doit être connecté avant de lancer un rendu. Aucun crédit n’a été utilisé.',
      );

    if (!process.env.DATABASE_URL || workspace.id === 'ws_local')
      throw new ApiError(503, 'Le moteur de rendu nécessite une base PostgreSQL et un workspace cloud.');

    // Fetch project data
    let snapshot: ProjectInput | null = null;
    const localProj = localProjects.get(input.projectId);
    if (localProj) {
      snapshot = localProj.data;
    } else if (process.env.DATABASE_URL) {
      try {
        const project = await db.project.findFirst({
          where: { id: input.projectId, workspaceId: workspace.id, archivedAt: null },
        });
        if (project) {
          if (project.requiresApproval && project.reviewStatus !== 'APPROVED')
            throw new ApiError(409, 'La validation de cette version doit être terminée avant le rendu.');
          snapshot = projectSchema.parse(project.data);
        }
      } catch (err) {
        if (err instanceof ApiError) throw err;
      }
    }

    if (!snapshot) throw new ApiError(404, 'Projet introuvable.');

    // Do not silently substitute a generic voice for a requested clone.
    if (snapshot.media?.narration === 'clone' &&
        (process.env.GEMINI_API_KEY || process.env.HEYGEN_API_KEY || openShortsConfigured()))
      throw new ApiError(422, 'Le clonage vocal nécessite le moteur local autorisé, sans route fournisseur externe.');
    if (snapshot.media?.kind === 'avatar' && !process.env.HEYGEN_API_KEY && !mediaConfigured() && !openShortsConfigured())
      throw new ApiError(422, 'Ajoutez HEYGEN_API_KEY ou connectez un moteur avatar compatible.');


    if (openShortsConfigured() && snapshot.media?.kind === 'avatar') {
      if (snapshot.duration !== 30 || snapshot.aspectRatio !== '9:16' ||
          snapshot.resolution === '4k')
        throw new ApiError(422, 'OpenShorts accepte ici uniquement 30 s, vertical 9:16, jusqu’à 1080p.');
      if (snapshot.script.hook.concat(' ', snapshot.script.body, ' ', snapshot.script.cta)
          .trim().split(/\\s+/).length > 70)
        throw new ApiError(422, 'Script trop long : maximum 70 mots pour le moteur OpenShorts.');
    }
    if (openShortsConfigured() && snapshot.media?.kind !== 'avatar' &&
        !process.env.GEMINI_API_KEY && !process.env.HEYGEN_API_KEY && !mediaConfigured() &&
        !(process.env.VIDEO_GATEWAY_URL && process.env.VIDEO_GATEWAY_TOKEN))
      throw new ApiError(422, 'Le moteur OpenShorts ne prend en charge ici que les projets avatar.');
    if (mediaConfigured() && !process.env.GEMINI_API_KEY && !process.env.HEYGEN_API_KEY &&
        !(openShortsConfigured() && snapshot.media?.kind === 'avatar')) {
      const engines = await mediaCapabilities();
      if (!engines)
        throw new ApiError(503, 'Le serveur média est indisponible. Aucun crédit utilisé.');
      const media = snapshot.media || { kind: 'product', narration: 'none' };
      if (media.kind === 'product' && !engines.product)
        throw new ApiError(422, 'Le moteur vidéo produit n’est pas installé.');
      if (
        media.kind === 'avatar' &&
        (!engines.avatar || !engines.actors.includes(snapshot.avatarId))
      )
        throw new ApiError(
          422,
          'Cet avatar n’est pas installé dans la bibliothèque autorisée du serveur.',
        );
      if (media.narration !== 'none' && !engines.tts)
        throw new ApiError(422, 'Le modèle vocal n’est pas chargé sur le serveur.');
      if (media.narration === 'standard' && !engines.voices.includes(snapshot.voiceId))
        throw new ApiError(422, 'Cette voix standard n’est pas installée sur le serveur.');
    }

    const plan = (workspace.plan || 'agency') as keyof typeof plans;
    if (plan in plans && !canRender(plan, snapshot.resolution))
      throw new ApiError(403, 'Cette résolution n’est pas incluse dans votre offre.');
    const cost = renderCost(snapshot.duration, snapshot.resolution);

    let render: LocalRender;
    if (workspace.id === 'ws_local' || !process.env.DATABASE_URL) {
      const renderId = `render_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      render = {
        id: renderId,
        workspaceId: workspace.id,
        projectId: input.projectId,
        status: 'PROCESSING',
        credits: cost,
        outputUrl: null,
        outputAssetId: null,
        error: null,
        createdAt: new Date(),
      };
      localRenders.set(renderId, { ...render, idempotencyKey: input.idempotencyKey } as LocalRender);
    } else {
      try {
        const dbJob = await db.$transaction(async (tx) => {
          const reserved = await tx.workspace.updateMany({
            where: { id: workspace.id, credits: { gte: cost } },
            data: { credits: { decrement: cost } },
          });
          if (!reserved.count) throw new ApiError(402, 'Crédits insuffisants.');
          const job = await tx.render.create({
            data: {
              workspaceId: workspace.id,
              projectId: input.projectId,
              idempotencyKey: input.idempotencyKey,
              input: snapshot,
              credits: cost,
            },
          });
          await tx.creditEntry.create({
            data: { workspaceId: workspace.id, renderId: job.id, amount: -cost, reason: 'RESERVE' },
          });
          return job;
        });
        render = {
          id: dbJob.id,
          workspaceId: dbJob.workspaceId,
          projectId: dbJob.projectId,
          status: 'PROCESSING',
          credits: dbJob.credits,
          outputUrl: dbJob.outputUrl,
          outputAssetId: dbJob.outputAssetId,
          error: dbJob.error,
          createdAt: dbJob.createdAt,
        };
      } catch (dbErr) {
        if (dbErr instanceof ApiError) throw dbErr;
        // Never claim a render was queued when neither the credit reservation
        // nor the durable job was persisted.
        throw new ApiError(503, 'La base de données est indisponible. Aucun rendu lancé.');
      }
    }

    // Video generation must run in a persistent worker, not an unawaited
    // Promise inside a serverless HTTP request.
    if (!process.env.DATABASE_URL || workspace.id === 'ws_local')
      throw new ApiError(503, 'Rendu cloud indisponible sans base de données.');
    if (!process.env.REDIS_URL)
      throw new ApiError(503, 'Rendu cloud indisponible sans Redis BullMQ.');

    // Durable BullMQ dispatch for ALL providers
    const queue = renderQueue();
    let dispatchPending = false;
    try {
      await queue.add('render', { renderId: render.id }, { jobId: render.id });
    } catch {
      dispatchPending = true;
    } finally {
      await queue.close();
    }
    return Response.json({ ...render, dispatchPending }, { status: 202 });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002')
      return errorResponse(
        new ApiError(409, 'Demande déjà reçue. Consultez les rendus avant de réessayer.'),
      );
    return errorResponse(e);
  }
}
