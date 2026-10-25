import { db } from '@vidi/db';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { requireWorkspace } from '@/lib/auth';
import { ApiError, errorResponse } from '@/lib/api';
import { storage } from '@/lib/storage';
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const render = await db.render.findUnique({ where: { id: (await params).id } });
    if (!render) throw new ApiError(404, 'Rendu introuvable.');
    await requireWorkspace(render.workspaceId, false, request);
    const asset = render.outputAssetId
      ? await db.asset.findFirst({
          where: {
            id: render.outputAssetId,
            workspaceId: render.workspaceId,
            confirmedAt: { not: null },
          },
        })
      : null;
    if (render.status !== 'COMPLETED' || !asset)
      throw new ApiError(404, 'Vidéo privée indisponible.');
    const { client, bucket } = storage();
    const url = await getSignedUrl(
      client,
      new GetObjectCommand({
        Bucket: bucket,
        Key: asset.key,
        ResponseContentType: 'video/mp4',
        ResponseContentDisposition: 'attachment; filename="vidi-video.mp4"',
      }),
      { expiresIn: 300 },
    );
    return new Response(null, {
      status: 302,
      headers: { Location: url, 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' },
    });
  } catch (e) {
    return errorResponse(e);
  }
}
