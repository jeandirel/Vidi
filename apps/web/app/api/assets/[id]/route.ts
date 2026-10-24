import { GetObjectCommand, HeadObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { db } from '@vidi/db';
import { requireWorkspace } from '@/lib/auth';
import { storage } from '@/lib/storage';
import { ApiError, checkOrigin, errorResponse } from '@/lib/api';
type Context = { params: Promise<{ id: string }> };
async function access(request: Request, id: string, write = false) {
  const asset = await db.asset.findUnique({ where: { id } });
  if (!asset) throw new ApiError(404, 'Média introuvable.');
  await requireWorkspace(asset.workspaceId, write, request);
  return asset;
}
export async function GET(request: Request, { params }: Context) {
  try {
    const a = await access(request, (await params).id);
    if (!a.confirmedAt) throw new ApiError(409, 'Upload non confirmé.');
    const { client, bucket } = storage();
    const url = await getSignedUrl(
      client,
      new GetObjectCommand({
        Bucket: bucket,
        Key: a.key,
        ResponseContentType: 'application/octet-stream',
        ResponseContentDisposition: 'attachment',
      }),
      { expiresIn: 300 },
    );
    return Response.json({ url }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    return errorResponse(e);
  }
}
export async function POST(request: Request, { params }: Context) {
  try {
    checkOrigin(request, true);
    const a = await access(request, (await params).id, true);
    const { client, bucket } = storage();
    const head = await client.send(new HeadObjectCommand({ Bucket: bucket, Key: a.key }));
    if (head.ContentLength !== a.size || head.ContentType?.split(';')[0] !== a.mime)
      throw new ApiError(422, 'Le média envoyé ne correspond pas au fichier déclaré.');
    await db.asset.update({ where: { id: a.id }, data: { confirmedAt: new Date() } });
    return Response.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
export async function DELETE(request: Request, { params }: Context) {
  try {
    checkOrigin(request, true);
    const a = await access(request, (await params).id, true);
    const { client, bucket } = storage();
    await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: a.key }));
    await db.asset.delete({ where: { id: a.id } });
    return Response.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
