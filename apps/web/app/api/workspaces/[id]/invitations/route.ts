import { randomBytes } from 'node:crypto';
import { z } from 'zod';
import { db } from '@vidi/db';
import { hashToken, requireOwner } from '@/lib/auth';
import { ApiError, checkOrigin, errorResponse, jsonBody } from '@/lib/api';
import { rateLimit } from '@/lib/rate-limit';
type Context = { params: Promise<{ id: string }> };
export async function GET(_: Request, { params }: Context) {
  try {
    const { id } = await params;
    await requireOwner(id);
    return Response.json({
      invitations: await db.invitation.findMany({
        where: { workspaceId: id, acceptedAt: null, expiresAt: { gt: new Date() } },
        select: { id: true, email: true, role: true, expiresAt: true },
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
    await requireOwner(id);
    await rateLimit(`invite:${id}`, 10, 60);
    const input = z
      .object({
        email: z
          .string()
          .email()
          .max(254)
          .transform((s) => s.toLowerCase()),
        role: z.enum(['EDITOR', 'VIEWER']),
      })
      .parse(await jsonBody(request));
    if (
      (await db.invitation.count({
        where: { workspaceId: id, acceptedAt: null, expiresAt: { gt: new Date() } },
      })) >= 100
    )
      throw new ApiError(409, 'Limite d’invitations actives atteinte.');
    const token = `vi_inv_${randomBytes(32).toString('hex')}`;
    await db.invitation.create({
      data: {
        workspaceId: id,
        email: input.email,
        role: input.role,
        tokenHash: hashToken(token),
        expiresAt: new Date(Date.now() + 7 * 86400000),
      },
    });
    const url = new URL('/', request.headers.get('origin')!);
    url.searchParams.set('invite', token);
    return Response.json(
      { url: url.href },
      { status: 201, headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (e) {
    return errorResponse(e);
  }
}
export async function DELETE(request: Request, { params }: Context) {
  try {
    checkOrigin(request);
    const { id } = await params;
    await requireOwner(id);
    const { invitationId } = z.object({ invitationId: z.string() }).parse(await jsonBody(request));
    await db.invitation.deleteMany({
      where: { id: invitationId, workspaceId: id, acceptedAt: null },
    });
    return Response.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
