import { z } from 'zod';
import { db, Prisma } from '@vidi/db';
import { plans } from '@vidi/core';
import { currentUser } from '@/lib/auth';
import { ApiError, checkOrigin, errorResponse, jsonBody } from '@/lib/api';
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const user = await currentUser();
    const { name } = z
      .object({ name: z.string().trim().min(2).max(80) })
      .parse(await jsonBody(request));
    const workspace = await db.$transaction(
      async (tx) => {
        const owned = await tx.membership.findMany({
          where: { userId: user.id, role: 'OWNER' },
          include: { workspace: true },
        });
        const cap = Math.max(
          1,
          ...owned.map((m) => plans[m.workspace.plan as keyof typeof plans]?.workspaces || 1),
        );
        if (owned.length >= cap)
          throw new ApiError(403, 'La limite d’espaces de votre offre est atteinte.');
        return tx.workspace.create({
          data: { name, memberships: { create: { userId: user.id, role: 'OWNER' } } },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
    return Response.json(workspace, { status: 201 });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2034')
      return errorResponse(new ApiError(409, 'Une création est déjà en cours. Réessayez.'));
    return errorResponse(e);
  }
}
