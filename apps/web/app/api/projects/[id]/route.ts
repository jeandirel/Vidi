import { isDeepStrictEqual } from 'node:util';
import { db } from '@vidi/db';
import { projectSchema } from '@vidi/core';
import { requireWorkspace } from '@/lib/auth';
import { ApiError, checkOrigin, errorResponse, jsonBody } from '@/lib/api';
type Context = { params: Promise<{ id: string }> };
async function accessible(id: string, write = false, request?: Request) {
  const project = await db.project.findUnique({ where: { id } });
  if (!project || project.archivedAt) throw new ApiError(404, 'Projet introuvable.');
  await requireWorkspace(project.workspaceId, write, request);
  return project;
}
export async function GET(request: Request, { params }: Context) {
  try {
    return Response.json(await accessible((await params).id, false, request));
  } catch (e) {
    return errorResponse(e);
  }
}
export async function PUT(request: Request, { params }: Context) {
  try {
    checkOrigin(request, true);
    const { id } = await params;
    const existing = await accessible(id, true, request);
    const data = projectSchema.parse(await jsonBody(request));
    if (isDeepStrictEqual(existing.data, data)) return Response.json(existing);
    return Response.json(
      await db.project.update({
        where: { id },
        data: { title: data.title, data, revision: { increment: 1 }, reviewStatus: 'DRAFT' },
      }),
    );
  } catch (e) {
    return errorResponse(e);
  }
}

export async function DELETE(request: Request, { params }: Context) {
  try {
    checkOrigin(request, true);
    const { id } = await params;
    await accessible(id, true, request);
    if (
      await db.render.count({ where: { projectId: id, status: { in: ['QUEUED', 'PROCESSING'] } } })
    )
      throw new ApiError(409, 'Attendez la fin des rendus avant d’archiver ce projet.');
    await db.project.update({ where: { id }, data: { archivedAt: new Date() } });
    return Response.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
