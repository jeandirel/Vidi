import { z } from 'zod';
import { db, Prisma } from '@vidi/db';
import { canRender, plans, projectSchema, renderCost } from '@vidi/core';
import { requireWorkspace } from '@/lib/auth';
import { ApiError, checkOrigin, errorResponse, jsonBody } from '@/lib/api';
import { renderQueue } from '@/lib/queue';
import { rateLimit } from '@/lib/rate-limit';
const schema = z.object({
  workspaceId: z.string().min(1),
  projectId: z.string().min(1),
  idempotencyKey: z.string().uuid(),
});
export async function GET(request: Request) {
  try {
    const workspaceId = new URL(request.url).searchParams.get('workspaceId') || '';
    await requireWorkspace(workspaceId, false, request);
    return Response.json({
      renders: await db.render.findMany({
        where: { workspaceId },
        select: {
          id: true,
          projectId: true,
          status: true,
          credits: true,
          outputUrl: true,
          error: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
    });
  } catch (e) {
    return errorResponse(e);
  }
}
export async function POST(request: Request) {
  try {
    checkOrigin(request, true);
    const input = schema.parse(await jsonBody(request));
    const workspace = await requireWorkspace(input.workspaceId, true, request);
    await rateLimit(`renders:${workspace.id}`, 10, 60);
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
    if (
      !process.env.VIDEO_GATEWAY_URL ||
      !process.env.VIDEO_GATEWAY_TOKEN ||
      !process.env.VIDEO_OUTPUT_HOSTS ||
      !process.env.REDIS_URL
    )
      throw new ApiError(
        503,
        'Le moteur vidéo doit être connecté avant de lancer un rendu. Aucun crédit n’a été utilisé.',
      );
    const project = await db.project.findFirst({
      where: { id: input.projectId, workspaceId: workspace.id, archivedAt: null },
    });
    if (!project) throw new ApiError(404, 'Projet introuvable.');
    if (project.requiresApproval && project.reviewStatus !== 'APPROVED')
      throw new ApiError(409, 'La validation de cette version doit être terminée avant le rendu.');
    const snapshot = projectSchema.parse(project.data);
    const plan = workspace.plan as keyof typeof plans;
    if (!(plan in plans) || !canRender(plan, snapshot.resolution))
      throw new ApiError(403, 'Cette résolution n’est pas incluse dans votre offre.');
    const cost = renderCost(snapshot.duration, snapshot.resolution);
    const render = await db.$transaction(async (tx) => {
      const reserved = await tx.workspace.updateMany({
        where: { id: workspace.id, credits: { gte: cost } },
        data: { credits: { decrement: cost } },
      });
      if (!reserved.count) throw new ApiError(402, 'Crédits insuffisants.');
      const job = await tx.render.create({
        data: {
          workspaceId: workspace.id,
          projectId: project.id,
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
