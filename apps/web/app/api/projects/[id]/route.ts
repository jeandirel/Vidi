import { db } from '@vidi/db';
import { projectSchema } from '@vidi/core';
import { requireWorkspace } from '@/lib/auth';
import { ApiError, checkOrigin, errorResponse, jsonBody } from '@/lib/api';
type Context = { params: Promise<{ id: string }> };
async function accessible(id: string, write = false) {
  const project = await db.project.findUnique({ where: { id } });
  if (!project) throw new ApiError(404, 'Projet introuvable.');
  await requireWorkspace(project.workspaceId, write);
  return project;
}
export async function GET(_: Request, { params }: Context) {
  try {
    return Response.json(await accessible((await params).id));
  } catch (e) {
    return errorResponse(e);
  }
}
export async function PUT(request: Request, { params }: Context) {
  try {
    checkOrigin(request);
    const { id } = await params;
    await accessible(id, true);
    const data = projectSchema.parse(await jsonBody(request));
    return Response.json(
      await db.project.update({ where: { id }, data: { title: data.title, data } }),
    );
  } catch (e) {
    return errorResponse(e);
  }
}
