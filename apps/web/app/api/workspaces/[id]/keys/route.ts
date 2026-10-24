import { randomBytes } from 'node:crypto';
import { z } from 'zod';
import { db } from '@vidi/db';
import { requireOwner, hashToken } from '@/lib/auth';
import { ApiError, checkOrigin, errorResponse, jsonBody } from '@/lib/api';
import { rateLimit } from '@/lib/rate-limit';
type Context = { params: Promise<{ id: string }> };
const select = {
  id: true,
  name: true,
  prefix: true,
  role: true,
  expiresAt: true,
  revokedAt: true,
  createdAt: true,
};
export async function GET(_: Request, { params }: Context) {
  try {
    const { id } = await params;
    await requireOwner(id);
    return Response.json({
      keys: await db.apiKey.findMany({
        where: { workspaceId: id },
        select,
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
    });
  } catch (e) {
    return errorResponse(e);
  }
}
export async function POST(request: Request, { params }: Context) {
  try {
    checkOrigin(request);
    const { id } = await params;
    const { user, workspace } = await requireOwner(id);
    if (workspace.plan !== 'agency')
      throw new ApiError(403, 'Les clés API sont incluses dans l’offre Agency.');
    await rateLimit(`new-key:${id}`, 5, 60);
    const input = z
      .object({
        name: z.string().trim().min(2).max(80),
        role: z.enum(['EDITOR', 'VIEWER']),
        days: z.number().int().min(1).max(90).default(30),
      })
      .parse(await jsonBody(request));
    if (
      (await db.apiKey.count({
        where: { workspaceId: id, revokedAt: null, expiresAt: { gt: new Date() } },
      })) >= 20
    )
      throw new ApiError(409, 'Maximum 20 clés actives par espace.');
    const token = `vi_key_${randomBytes(32).toString('hex')}`;
    const key = await db.apiKey.create({
      data: {
        workspaceId: id,
        userId: user.id,
        name: input.name,
        role: input.role,
        prefix: token.slice(0, 15),
        tokenHash: hashToken(token),
        expiresAt: new Date(Date.now() + input.days * 86400000),
      },
      select,
    });
    return Response.json({ key, token }, { status: 201, headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    return errorResponse(e);
  }
}
export async function DELETE(request: Request, { params }: Context) {
  try {
    checkOrigin(request);
    const { id } = await params;
    await requireOwner(id);
    const { keyId } = z.object({ keyId: z.string() }).parse(await jsonBody(request));
    await db.apiKey.updateMany({
      where: { id: keyId, workspaceId: id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return Response.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
