import { z } from 'zod';
import { db } from '@vidi/db';
import { currentUser, hashToken } from '@/lib/auth';
import { ApiError, checkOrigin, errorResponse, jsonBody } from '@/lib/api';
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const user = await currentUser();
    const { token } = z
      .object({ token: z.string().regex(/^vi_inv_[a-f0-9]{64}$/) })
      .parse(await jsonBody(request));
    const workspaceId = await db.$transaction(async (tx) => {
      const invitation = await tx.invitation.findUnique({ where: { tokenHash: hashToken(token) } });
      if (
        !invitation ||
        invitation.email !== user.email ||
        invitation.expiresAt < new Date() ||
        invitation.acceptedAt
      )
        throw new ApiError(404, 'Invitation indisponible pour ce compte.');
      const claimed = await tx.invitation.updateMany({
        where: { id: invitation.id, acceptedAt: null, expiresAt: { gt: new Date() } },
        data: { acceptedAt: new Date() },
      });
      if (!claimed.count) throw new ApiError(409, 'Invitation déjà utilisée.');
      await tx.membership.upsert({
        where: { userId_workspaceId: { userId: user.id, workspaceId: invitation.workspaceId } },
        create: { userId: user.id, workspaceId: invitation.workspaceId, role: invitation.role },
        update: {},
      });
      return invitation.workspaceId;
    });
    return Response.json({ workspaceId });
  } catch (e) {
    return errorResponse(e);
  }
}
