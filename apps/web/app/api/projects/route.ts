import { db } from '@vidi/db';
import { projectSchema } from '@vidi/core';
import { requireWorkspace } from '@/lib/auth';
import { ApiError, checkOrigin, errorResponse, jsonBody } from '@/lib/api';
import { z } from 'zod';
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const workspaceId = url.searchParams.get('workspaceId') || '';
    await requireWorkspace(workspaceId);
    const cursor = url.searchParams.get('cursor');
    const projects = await db.project.findMany({
      where: { workspaceId },
      orderBy: { id: 'desc' },
      take: 21,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });
    return Response.json({
      projects: projects.slice(0, 20),
      nextCursor: projects.length > 20 ? projects[19].id : null,
    });
  } catch (e) {
    return errorResponse(e);
  }
}
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const { workspaceId, data } = z
      .object({ workspaceId: z.string().min(1), data: projectSchema })
      .parse(await jsonBody(request));
    await requireWorkspace(workspaceId, true);
    if ((await db.project.count({ where: { workspaceId } })) >= 1000)
      throw new ApiError(409, 'Limite de projets atteinte.');
    const project = await db.project.create({ data: { workspaceId, title: data.title, data } });
    return Response.json(project, { status: 201 });
  } catch (e) {
    return errorResponse(e);
  }
}
