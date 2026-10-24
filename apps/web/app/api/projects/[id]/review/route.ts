import { z } from 'zod';
import { db } from '@vidi/db';
import { currentUser, requireWorkspace } from '@/lib/auth';
import { ApiError, checkOrigin, errorResponse, jsonBody } from '@/lib/api';
type Context = { params: Promise<{ id: string }> };
export async function GET(_: Request, { params }: Context) {
  try {
    const { id } = await params;
    const project = await db.project.findFirst({ where: { id, archivedAt: null } });
    if (!project) throw new ApiError(404, 'Projet introuvable.');
    await requireWorkspace(project.workspaceId);
    const reviews = await db.projectReview.findMany({
      where: { projectId: id },
      include: { author: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return Response.json({ revision: project.revision, status: project.reviewStatus, reviews });
  } catch (e) {
    return errorResponse(e);
  }
}
export async function POST(request: Request, { params }: Context) {
  try {
    checkOrigin(request);
    const user = await currentUser();
    const { id } = await params;
    const input = z
      .object({
        revision: z.number().int().positive(),
        decision: z.enum(['IN_REVIEW', 'APPROVED', 'CHANGES_REQUESTED']),
        message: z.string().trim().max(2000).default(''),
      })
      .parse(await jsonBody(request));
    await db.$transaction(async (tx) => {
      const project = await tx.project.findFirst({ where: { id, archivedAt: null } });
      if (!project) throw new ApiError(404, 'Projet introuvable.');
      const membership = user.memberships.find((m) => m.workspaceId === project.workspaceId);
      if (!membership) throw new ApiError(404, 'Projet introuvable.');
      if (input.decision === 'IN_REVIEW' && membership.role === 'VIEWER')
        throw new ApiError(403, 'Accès en lecture seule.');
      if (input.decision !== 'IN_REVIEW' && membership.role === 'EDITOR')
        throw new ApiError(403, 'Un client ou le propriétaire doit valider cette version.');
      if (input.decision !== 'IN_REVIEW' && project.reviewStatus !== 'IN_REVIEW')
        throw new ApiError(409, 'Ce projet n’est pas en attente de validation.');
      if (input.decision === 'IN_REVIEW' && project.reviewStatus === 'IN_REVIEW')
        throw new ApiError(409, 'La validation est déjà demandée.');
      const changed = await tx.project.updateMany({
        where: {
          id,
          revision: input.revision,
          reviewStatus: project.reviewStatus,
          archivedAt: null,
        },
        data: {
          reviewStatus: input.decision,
          ...(input.decision === 'IN_REVIEW' ? { requiresApproval: true } : {}),
        },
      });
      if (!changed.count)
        throw new ApiError(409, 'Le projet a été modifié. Actualisez avant de valider.');
      await tx.projectReview.create({
        data: {
          projectId: id,
          authorId: user.id,
          revision: input.revision,
          decision: input.decision,
          message: input.message,
        },
      });
    });
    return Response.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
