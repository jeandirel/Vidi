import { z } from 'zod';
import { db } from '@vidi/db';
import { requireOwner, requireWorkspace } from '@/lib/auth';
import { checkOrigin, errorResponse, jsonBody, ApiError } from '@/lib/api';
import {
  catalog,
  connectionSchema,
  sealSecret,
  openSecret,
  storeBase,
  youtubeTrends,
} from '@/lib/connections';
import { rateLimit } from '@/lib/rate-limit';
export async function GET(request: Request) {
  try {
    const workspaceId = new URL(request.url).searchParams.get('workspaceId') || '';
    await requireWorkspace(workspaceId, false, request);
    const connections = await db.serviceConnection.findMany({
      where: { workspaceId },
      select: { id: true, provider: true, config: true, checkedAt: true },
    });
    return Response.json({ connections }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    return errorResponse(e);
  }
}
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const input = connectionSchema.parse(await jsonBody(request));
    await requireOwner(input.workspaceId);
    await rateLimit(`connections:${input.workspaceId}`, 5, 60);
    const previous = await db.serviceConnection.findUnique({
      where: { workspaceId_provider: { workspaceId: input.workspaceId, provider: input.provider } },
    });
    const context = `${input.workspaceId}:${input.provider}`;
    let sealedSecret: string | null = null;
    const config =
      input.provider === 'youtube' ? { region: input.region } : { url: storeBase(input.url) };
    if (input.provider === 'youtube') {
      const secret =
        input.secret || (previous?.sealedSecret ? openSecret(previous.sealedSecret, context) : '');
      if (!secret) throw new ApiError(400, 'Une clé YouTube Data API est requise.');
      sealedSecret = sealSecret(secret, context);
      await youtubeTrends(secret, input.region);
    } else await catalog(input.provider, input.url);
    await db.serviceConnection.upsert({
      where: { workspaceId_provider: { workspaceId: input.workspaceId, provider: input.provider } },
      create: {
        workspaceId: input.workspaceId,
        provider: input.provider,
        config,
        sealedSecret,
        checkedAt: new Date(),
      },
      update: { config, sealedSecret, checkedAt: new Date() },
    });
    return Response.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
export async function DELETE(request: Request) {
  try {
    checkOrigin(request);
    const input = z
      .object({ workspaceId: z.string(), provider: z.enum(['shopify', 'woocommerce', 'youtube']) })
      .parse(await jsonBody(request));
    await requireOwner(input.workspaceId);
    await db.serviceConnection.deleteMany({ where: input });
    return Response.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
