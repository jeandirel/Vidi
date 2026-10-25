import { db } from '@vidi/db';
import { requireWorkspace } from '@/lib/auth';
import { ApiError, errorResponse } from '@/lib/api';
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const render = await db.render.findUnique({
      where: { id: (await params).id },
      select: {
        id: true,
        workspaceId: true,
        projectId: true,
        status: true,
        credits: true,
        outputUrl: true,
        outputAssetId: true,
        error: true,
        createdAt: true,
      },
    });
    if (!render) throw new ApiError(404, 'Rendu introuvable.');
    await requireWorkspace(render.workspaceId, false, request);
    return Response.json(render);
  } catch (e) {
    return errorResponse(e);
  }
}
