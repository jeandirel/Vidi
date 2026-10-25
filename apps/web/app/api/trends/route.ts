import { z } from 'zod';
import { db } from '@vidi/db';
import { requireWorkspace } from '@/lib/auth';
import { ApiError, errorResponse } from '@/lib/api';
import { openSecret, youtubeTrends } from '@/lib/connections';
import { rateLimit } from '@/lib/rate-limit';
export async function GET(request: Request) {
  try {
    const workspaceId = new URL(request.url).searchParams.get('workspaceId') || '';
    await requireWorkspace(workspaceId, false, request);
    await rateLimit(`trends:${workspaceId}`, 5, 60);
    const connection = await db.serviceConnection.findUnique({
      where: { workspaceId_provider: { workspaceId, provider: 'youtube' } },
    });
    if (!connection?.sealedSecret)
      throw new ApiError(409, 'Connectez une clé YouTube Data API dans Mon espace.');
    const { region } = z
      .object({ region: z.string().regex(/^[A-Z]{2}$/) })
      .parse(connection.config);
    return Response.json(
      await youtubeTrends(openSecret(connection.sealedSecret, `${workspaceId}:youtube`), region),
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (e) {
    return errorResponse(e);
  }
}
