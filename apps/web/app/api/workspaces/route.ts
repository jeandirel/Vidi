import { z } from 'zod';
import { db } from '@vidi/db';
import { currentUser } from '@/lib/auth';
import { ApiError, checkOrigin, errorResponse, jsonBody } from '@/lib/api';
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const user = await currentUser();
    const { name } = z
      .object({ name: z.string().trim().min(2).max(80) })
      .parse(await jsonBody(request));
    const owned = user.memberships.filter((m) => m.role === 'OWNER');
    if (owned.length >= 1)
      throw new ApiError(
        403,
        'La création de plusieurs espaces sera activée avec les abonnements Pro et Agency.',
      );
    const workspace = await db.workspace.create({
      data: { name, memberships: { create: { userId: user.id, role: 'OWNER' } } },
    });
    return Response.json(workspace, { status: 201 });
  } catch (e) {
    return errorResponse(e);
  }
}
