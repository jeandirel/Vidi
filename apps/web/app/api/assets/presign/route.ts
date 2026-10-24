import { randomUUID } from 'node:crypto';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { z } from 'zod';
import { requireWorkspace } from '@/lib/auth';
import { ApiError, checkOrigin, errorResponse, jsonBody } from '@/lib/api';
import { rateLimit } from '@/lib/rate-limit';
const schema = z.object({
  workspaceId: z.string(),
  type: z.enum(['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'audio/mpeg']),
  size: z
    .number()
    .int()
    .positive()
    .max(100 * 1024 * 1024),
});
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const input = schema.parse(await jsonBody(request));
    await requireWorkspace(input.workspaceId, true);
    await rateLimit(`upload:${input.workspaceId}`, 20, 60);
    if (!process.env.S3_BUCKET || !process.env.S3_REGION)
      throw new ApiError(503, 'Le stockage média doit être connecté.');
    const key = `${input.workspaceId}/${randomUUID()}`;
    const client = new S3Client({
      region: process.env.S3_REGION,
      endpoint: process.env.S3_ENDPOINT,
      forcePathStyle: !!process.env.S3_ENDPOINT,
    });
    const uploadUrl = await getSignedUrl(
      client,
      new PutObjectCommand({
        Bucket: process.env.S3_BUCKET,
        Key: key,
        ContentType: input.type,
        ContentLength: input.size,
      }),
      { expiresIn: 300 },
    );
    return Response.json({ key, uploadUrl, expiresIn: 300 });
  } catch (e) {
    return errorResponse(e);
  }
}
