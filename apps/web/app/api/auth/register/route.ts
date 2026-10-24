import { z } from 'zod';
import { db, Prisma } from '@vidi/db';
import { checkOrigin, errorResponse, jsonBody, needsDatabase, ApiError } from '@/lib/api';
import { hashPassword, hashToken, newSession } from '@/lib/auth';
import { rateLimit } from '@/lib/rate-limit';
const schema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z
    .string()
    .email()
    .max(254)
    .transform((s) => s.toLowerCase()),
  password: z.string().min(12).max(128),
});
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    needsDatabase();
    const input = schema.parse(await jsonBody(request));
    await rateLimit(`signup:${hashToken(input.email)}`, 3, 3600);
    await rateLimit('signup:global', 30, 3600);
    const passwordHash = await hashPassword(input.password);
    const user = await db.user.create({
      data: {
        name: input.name,
        email: input.email,
        passwordHash,
        memberships: {
          create: { role: 'OWNER', workspace: { create: { name: `${input.name} Studio` } } },
        },
      },
    });
    await newSession(user.id);
    return Response.json({ id: user.id, name: user.name }, { status: 201 });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002')
      return errorResponse(
        new ApiError(409, 'Impossible de créer ce compte. Essayez de vous connecter.'),
      );
    return errorResponse(e);
  }
}
