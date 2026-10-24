import { z } from 'zod';
import { db } from '@vidi/db';
import { requireOwner } from '@/lib/auth';
import { ApiError, checkOrigin, errorResponse, jsonBody } from '@/lib/api';
type Context = { params: Promise<{ id: string }> };
export async function GET(_: Request, { params }: Context) {
  try {
    const { id } = await params;
    await requireOwner(id);
    return Response.json({
      members: await db.membership.findMany({
        where: { workspaceId: id },
        select: { role: true, user: { select: { id: true, name: true, email: true } } },
      }),
    });
  } catch (e) {
    return errorResponse(e);
  }
}
export async function PATCH(request: Request, { params }: Context) {
  try {
    checkOrigin(request);
    const { id } = await params;
    await requireOwner(id);
    const input = z
      .object({ userId: z.string(), role: z.enum(['EDITOR', 'VIEWER']) })
      .parse(await jsonBody(request));
    const changed = await db.membership.updateMany({
      where: { workspaceId: id, userId: input.userId, role: { not: 'OWNER' } },
      data: { role: input.role },
    });
    if (!changed.count)
      throw new ApiError(409, 'Le propriétaire ne peut pas être modifié par cette action.');
    return Response.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
export async function DELETE(request: Request, { params }: Context) {
  try {
    checkOrigin(request);
    const { id } = await params;
    await requireOwner(id);
    const input = z.object({ userId: z.string() }).parse(await jsonBody(request));
    const changed = await db.membership.deleteMany({
      where: { workspaceId: id, userId: input.userId, role: { not: 'OWNER' } },
    });
    if (!changed.count) throw new ApiError(409, 'Le propriétaire ne peut pas être retiré.');
    return Response.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
