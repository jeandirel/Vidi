import { db } from '@vidi/db';
import { requireWorkspace } from '@/lib/auth';
import { errorResponse } from '@/lib/api';
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const workspaceId = url.searchParams.get('workspaceId') || '';
    await requireWorkspace(workspaceId, false, request);
    return Response.json({
      assets: await db.asset.findMany({
        where: { workspaceId, confirmedAt: { not: null } },
        select: { id: true, name: true, mime: true, size: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
    });
  } catch (e) {
    return errorResponse(e);
  }
}
