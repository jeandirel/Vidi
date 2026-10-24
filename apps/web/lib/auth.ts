import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { cookies } from 'next/headers';
import { db, Role } from '@vidi/db';
import { ApiError, needsDatabase } from './api';
const scrypt = promisify(scryptCallback);
export const hashToken = (value: string) => createHash('sha256').update(value).digest('hex');
export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  const hash = (await scrypt(password, salt, 64)) as Buffer;
  return `${salt}:${hash.toString('hex')}`;
}
export async function verifyPassword(password: string, stored: string) {
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) return false;
  const actual = (await scrypt(password, salt, 64)) as Buffer;
  const expected = Buffer.from(hash, 'hex');
  return expected.length === actual.length && timingSafeEqual(actual, expected);
}
export async function newSession(userId: string) {
  const token = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 7 * 86400000);
  await db.session.create({ data: { userId, tokenHash: hashToken(token), expiresAt } });
  (await cookies()).set('vidi_session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires: expiresAt,
  });
}
export async function currentUser() {
  needsDatabase();
  const token = (await cookies()).get('vidi_session')?.value;
  if (!token) throw new ApiError(401, 'Connectez-vous pour accéder à votre espace.');
  const session = await db.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: { include: { memberships: { include: { workspace: true } } } } },
  });
  if (!session || session.expiresAt < new Date())
    throw new ApiError(401, 'Votre session a expiré.');
  return session.user;
}
export async function requireWorkspace(id: string, write = false) {
  const user = await currentUser();
  const membership = user.memberships.find((m) => m.workspaceId === id);
  if (!membership) throw new ApiError(404, 'Espace introuvable.');
  if (write && membership.role === Role.VIEWER) throw new ApiError(403, 'Accès en lecture seule.');
  return membership.workspace;
}
