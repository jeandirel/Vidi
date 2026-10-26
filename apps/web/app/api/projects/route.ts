import { db } from '@vidi/db';
import { projectSchema } from '@vidi/core';
import { requireWorkspace } from '@/lib/auth';
import { ApiError, checkOrigin, errorResponse, jsonBody } from '@/lib/api';
import { localProjects } from '@/lib/local-store';
import { z } from 'zod';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const workspaceId = url.searchParams.get('workspaceId') || '';
    await requireWorkspace(workspaceId, false, request);
    const query = (url.searchParams.get('q') || '').trim().toLowerCase();

    if (workspaceId === 'ws_local' || !process.env.DATABASE_URL) {
      const all = Array.from(localProjects.values())
        .filter((p) => p.workspaceId === workspaceId && !p.archivedAt)
        .filter((p) => !query || p.title.toLowerCase().includes(query))
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      return Response.json({
        projects: all.slice(0, 20),
        nextCursor: null,
      });
    }

    try {
      const cursor = url.searchParams.get('cursor');
      const projects = await db.project.findMany({
        where: {
          workspaceId,
          archivedAt: null,
          ...(query ? { title: { contains: query, mode: 'insensitive' as const } } : {}),
        },
        orderBy: { id: 'desc' },
        take: 21,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      });
      return Response.json({
        projects: projects.slice(0, 20),
        nextCursor: projects.length > 20 ? projects[19].id : null,
      });
    } catch {
      const all = Array.from(localProjects.values())
        .filter((p) => p.workspaceId === workspaceId && !p.archivedAt)
        .filter((p) => !query || p.title.toLowerCase().includes(query));
      return Response.json({
        projects: all.slice(0, 20),
        nextCursor: null,
      });
    }
  } catch (e) {
    return errorResponse(e);
  }
}

export async function POST(request: Request) {
  try {
    checkOrigin(request, true);
    const { workspaceId, data } = z
      .object({ workspaceId: z.string().min(1), data: projectSchema })
      .parse(await jsonBody(request));
    await requireWorkspace(workspaceId, true, request);

    if (workspaceId === 'ws_local' || !process.env.DATABASE_URL) {
      const id = `proj_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      const project = {
        id,
        workspaceId,
        title: data.title,
        data,
        revision: 1,
        reviewStatus: 'APPROVED',
        archivedAt: null,
        createdAt: new Date(),
      };
      localProjects.set(id, project);
      return Response.json(project, { status: 201 });
    }

    try {
      if ((await db.project.count({ where: { workspaceId } })) >= 1000)
        throw new ApiError(409, 'Limite de projets atteinte.');
      const project = await db.project.create({ data: { workspaceId, title: data.title, data } });
      return Response.json(project, { status: 201 });
    } catch (dbErr) {
      if (dbErr instanceof ApiError) throw dbErr;
      const id = `proj_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      const project = {
        id,
        workspaceId,
        title: data.title,
        data,
        revision: 1,
        reviewStatus: 'APPROVED',
        archivedAt: null,
        createdAt: new Date(),
      };
      localProjects.set(id, project);
      return Response.json(project, { status: 201 });
    }
  } catch (e) {
    return errorResponse(e);
  }
}

