import { z } from 'zod';
import { db } from '@vidi/db';
import { currentUser, requireWorkspace } from '@/lib/auth';
import { ApiError, checkOrigin, errorResponse, jsonBody } from '@/lib/api';
import { rateLimit } from '@/lib/rate-limit';
export async function GET(request: Request) {
  try {
    const workspaceId = new URL(request.url).searchParams.get('workspaceId') || '';
    await requireWorkspace(workspaceId, false, request);
    return Response.json(
      {
        profiles: await db.voiceProfile.findMany({
          where: { workspaceId, revokedAt: null, sourceAssetId: { not: null } },
          select: { id: true, name: true, consentAt: true },
          orderBy: { consentAt: 'desc' },
          take: 50,
        }),
        generations: await db.voiceGeneration.findMany({
          where: { workspaceId },
          select: { id: true, status: true, outputAssetId: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
          take: 20,
        }),
      },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (e) {
    return errorResponse(e);
  }
}
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const input = z
      .object({
        workspaceId: z.string(),
        name: z.string().trim().min(2).max(100),
        sourceAssetId: z.string(),
        consent: z.literal(true),
      })
      .parse(await jsonBody(request));
    await requireWorkspace(input.workspaceId, true);
    const user = await currentUser();
    await rateLimit(`voice-profile:${input.workspaceId}`, 5, 60);
    const asset = await db.asset.findFirst({
      where: {
        id: input.sourceAssetId,
        workspaceId: input.workspaceId,
        confirmedAt: { not: null },
        mime: { in: ['audio/mpeg', 'audio/wav'] },
        size: { lte: 10 * 1024 * 1024 },
      },
    });
    if (!asset)
      throw new ApiError(
        422,
        'Choisissez un fichier audio confirmé de cet espace, de moins de 10 Mo.',
      );
    if (
      (await db.voiceProfile.count({
        where: { workspaceId: input.workspaceId, revokedAt: null },
      })) >= 20
    )
      throw new ApiError(409, 'Maximum 20 voix actives par espace.');
    const profile = await db.voiceProfile.create({
      data: {
        workspaceId: input.workspaceId,
        name: input.name,
        sourceAssetId: asset.id,
        consentUserId: user.id,
        consentVersion: 'voice-rights-v1',
      },
      select: { id: true, name: true, consentAt: true },
    });
    return Response.json(profile, { status: 201 });
  } catch (e) {
    return errorResponse(e);
  }
}
export async function DELETE(request: Request) {
  try {
    checkOrigin(request);
    const input = z
      .object({ workspaceId: z.string(), profileId: z.string() })
      .parse(await jsonBody(request));
    await requireWorkspace(input.workspaceId, true);
    await db.voiceProfile.updateMany({
      where: { id: input.profileId, workspaceId: input.workspaceId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return Response.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
