import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
  HeadObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { db, Prisma } from '@vidi/db';
import { type ProjectInput } from '@vidi/core';
import { productImage } from './image';
function storage() {
  if (!process.env.S3_BUCKET) throw new Error('Media storage not configured');
  return {
    bucket: process.env.S3_BUCKET,
    client: new S3Client({
      region: process.env.S3_REGION || process.env.AWS_REGION,
      endpoint: process.env.S3_ENDPOINT || process.env.AWS_ENDPOINT_URL_S3,
      forcePathStyle: !!(process.env.S3_ENDPOINT || process.env.AWS_ENDPOINT_URL_S3),
      requestChecksumCalculation: 'WHEN_REQUIRED',
    }),
  };
}
export async function mediaRequest(path: string, body?: unknown) {
  const url = new URL(process.env.MEDIA_GATEWAY_URL!);
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash)
    throw new Error('Invalid media gateway');
  url.pathname = url.pathname.replace(/\/$/, '') + path;
  const response = await fetch(url, {
    method: body === undefined ? 'GET' : 'POST',
    redirect: 'error',
    signal: AbortSignal.timeout(15000),
    headers: {
      Authorization: `Bearer ${process.env.MEDIA_GATEWAY_TOKEN}`,
      'Content-Type': 'application/json',
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  if (response.status === 404 && body === undefined && path.startsWith('/jobs/'))
    return { status: 'NEW' };
  if (!response.ok) throw new Error('Media gateway unavailable');
  return response.json() as Promise<{ status: string; error?: string }>;
}
export async function voiceReference(profileId: string, workspaceId: string) {
  const profile = await db.voiceProfile.findFirst({
    where: { id: profileId, workspaceId, revokedAt: null },
    include: { sourceAsset: true },
  });
  if (!profile?.sourceAsset?.confirmedAt || profile.sourceAsset.workspaceId !== workspaceId)
    throw new Error('Voice consent is unavailable');
  const { client, bucket } = storage();
  return getSignedUrl(
    client,
    new GetObjectCommand({ Bucket: bucket, Key: profile.sourceAsset.key }),
    { expiresIn: 3600 },
  );
}
export async function removeOutput(key: string) {
  const { client, bucket } = storage();
  await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}
export async function executeMedia(
  id: string,
  workspaceId: string,
  input:
    | { project: ProjectInput }
    | { text: string; language: string; emotion: string; profileId: string },
) {
  const video = 'project' in input;
  const key = `${workspaceId}/generated/${id}.${video ? 'mp4' : 'wav'}`;
  const mime = video ? 'video/mp4' : 'audio/wav';
  const { client, bucket } = storage();
  const profileId = video
    ? input.project.media?.narration === 'clone'
      ? input.project.media.voiceProfileId
      : undefined
    : input.profileId;
  const previous = await mediaRequest(`/jobs/${id}`);
  if (previous.status === 'NEW') {
    const uploadUrl = await getSignedUrl(
      client,
      new PutObjectCommand({ Bucket: bucket, Key: key, ContentType: mime }),
      { expiresIn: 3600 },
    );
    const referenceUrl = profileId ? await voiceReference(profileId, workspaceId) : undefined;
    const payload = video
      ? {
          project: {
            ...input.project,
            campaign: undefined,
            product: {
              ...input.project.product,
              image: await productImage(input.project.product.image),
            },
          },
        }
      : { text: input.text, language: input.language, emotion: input.emotion };
    await mediaRequest('/jobs', {
      id,
      kind: video ? 'video' : 'voice',
      ...payload,
      referenceUrl,
      uploadUrl,
    });
  }
  const deadline = Date.now() + 30 * 60000;
  let complete = false;
  while (Date.now() < deadline) {
    const state = await mediaRequest(`/jobs/${id}`);
    if (state.status === 'COMPLETED') {
      complete = true;
      break;
    }
    if (state.status === 'FAILED') throw new Error('Media generation failed');
    await new Promise((resolve) => setTimeout(resolve, 3000));
  }
  if (!complete) throw new Error('Media generation deadline exceeded');
  if (profileId) {
    const current = await db.voiceProfile.findFirst({
      where: { id: profileId, workspaceId, revokedAt: null, sourceAssetId: { not: null } },
    });
    if (!current) {
      await removeOutput(key);
      throw new Error('Voice consent revoked');
    }
  }
  const head = await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
  const size = head.ContentLength || 0;
  const used = await db.asset.aggregate({
    where: { workspaceId, key: { not: key } },
    _sum: { size: true },
  });
  if (
    !size ||
    size > (video ? 100 : 20) * 1024 * 1024 ||
    head.ContentType !== mime ||
    (used._sum.size || 0) + size > 1024 * 1024 * 1024
  ) {
    await removeOutput(key);
    throw new Error('Invalid generated media or workspace quota');
  }
  return {
    key,
    mime,
    size,
    workspaceId,
    name: `Vidi ${video ? 'vidéo.mp4' : 'voix.wav'}`,
    confirmedAt: new Date(),
  };
}

export async function lockVoiceConsent(
  tx: Prisma.TransactionClient,
  profileId: string | undefined,
  workspaceId: string,
) {
  if (!profileId) return;
  const active = await tx.$queryRaw<
    { id: string }[]
  >`SELECT id FROM "VoiceProfile" WHERE id=${profileId} AND "workspaceId"=${workspaceId} AND "revokedAt" IS NULL AND "sourceAssetId" IS NOT NULL FOR UPDATE`;
  if (!active.length) throw new Error('Voice consent revoked before delivery');
}
