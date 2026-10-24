import { z } from 'zod';
import { db } from '@vidi/db';
import { checkOrigin, errorResponse, jsonBody, needsDatabase, ApiError } from '@/lib/api';
import { hashToken, verifyPassword, newSession } from '@/lib/auth';
import { rateLimit } from '@/lib/rate-limit';
const schema = z.object({
  email: z
    .string()
    .email()
    .max(254)
    .transform((s) => s.toLowerCase()),
  password: z.string().min(1).max(128),
});
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    needsDatabase();
    const input = schema.parse(await jsonBody(request));
    await rateLimit(`login:${hashToken(input.email)}`, 6, 60);
    await rateLimit('login:global', 120, 60);
    const user = await db.user.findUnique({ where: { email: input.email } });
    const hash = user?.passwordHash || 'b62c62a1b62c62a1b62c62a1b62c62a1:' + '00'.repeat(64);
    const valid = await verifyPassword(input.password, hash);
    if (!user || !valid) throw new ApiError(401, 'Email ou mot de passe incorrect.');
    await newSession(user.id);
    return Response.json({ id: user.id, name: user.name });
  } catch (e) {
    return errorResponse(e);
  }
}
