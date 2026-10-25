import { randomUUID } from 'node:crypto';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { z } from 'zod';
import { db } from '@vidi/db';
import { storage } from '@/lib/storage';
import { requireWorkspace } from '@/lib/auth';
import { ApiError, checkOrigin, errorResponse, jsonBody } from '@/lib/api';
import { rateLimit } from '@/lib/rate-limit';
const schema = z.object({
  workspaceId: z.string(),
  name: z.string().trim().min(1).max(200).default('Média'),
  type: z.enum(['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'audio/mpeg', 'audio/wav']),
  size: z
    .number()
    .int()
    .positive()
    .max(100 * 1024 * 1024),
});
export async function POST(request: Request) {
  try {
    checkOrigin(request, true);
    const input = schema.parse(await jsonBody(request));
    await requireWorkspace(input.workspaceId, true, request);
    await rateLimit(`upload:${input.workspaceId}`, 20, 60);
    const { client, bucket } = storage();
    const key = `${input.workspaceId}/${randomUUID()}`;
    const used = await db.asset.aggregate({
      where: { workspaceId: input.workspaceId },
      _sum: { size: true },
    });
    if ((used._sum.size || 0) + input.size > 1024 * 1024 * 1024)
      throw new ApiError(413, 'La limite de stockage de cet espace est atteinte.');
    const uploadUrl = await getSignedUrl(
      client,
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        ContentType: input.type,
        ContentLength: input.size,
      }),
      { expiresIn: 300 },
    );
    const asset = await db.asset.create({
      data: {
        workspaceId: input.workspaceId,
        key,
        name: input.name,
        mime: input.type,
        size: input.size,
      },
    });
    return Response.json({ assetId: asset.id, key, uploadUrl, expiresIn: 300 });
  } catch (e) {
    return errorResponse(e);
  }
}
