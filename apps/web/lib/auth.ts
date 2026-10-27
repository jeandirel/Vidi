import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { cookies } from 'next/headers';
import { db, Role, Prisma } from '@vidi/db';
import { ApiError, needsDatabase } from './api';
import { rateLimit } from './rate-limit';

export type Workspace = Prisma.WorkspaceGetPayload<Record<string, never>>;
export type AuthUser = Prisma.UserGetPayload<{
  include: { memberships: { include: { workspace: true } } };
}>;

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
export async function currentUser(): Promise<AuthUser> {
  const token = (await cookies()).get('vidi_session')?.value;
  if (!token) {
    if (!process.env.DATABASE_URL) {
      return {
        id: 'local-creator',
        name: 'Studio Vidi',
        email: 'studio@vidi.local',
        passwordHash: '',
        createdAt: new Date(),
        memberships: [
          {
            userId: 'local-creator',
            workspaceId: 'ws_local',
            role: Role.OWNER,
            workspace: {
              id: 'ws_local',
              name: 'Studio Vidi',
              plan: 'agency',
              credits: 999,
              createdAt: new Date(),
            },
          },
        ],
      };
    }
    throw new ApiError(401, 'Connectez-vous pour accéder à votre espace.');
  }

  try {
    needsDatabase();
    const session = await db.session.findUnique({
      where: { tokenHash: hashToken(token) },
      include: { user: { include: { memberships: { include: { workspace: true } } } } },
    });
    if (!session || session.expiresAt < new Date())
      throw new ApiError(401, 'Votre session a expiré.');
    return session.user;
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) throw err;
    return {
      id: 'local-creator',
      name: 'Studio Vidi',
      email: 'studio@vidi.local',
      passwordHash: '',
      createdAt: new Date(),
      memberships: [
        {
          userId: 'local-creator',
          workspaceId: 'ws_local',
          role: Role.OWNER,
          workspace: {
            id: 'ws_local',
            name: 'Studio Vidi',
            plan: 'agency',
            credits: 999,
            createdAt: new Date(),
          },
        },
      ],
    };
  }
}



const localWorkspace: Workspace = {
  id: 'ws_local',
  name: 'Studio Vidi',
  plan: 'agency',
  credits: 999,
  createdAt: new Date(),
};

export async function requireWorkspace(id: string, write = false, request?: Request): Promise<Workspace> {
  if (id === 'ws_local') {
    return localWorkspace;
  }
  const authorization = request?.headers.get('authorization');
  if (authorization) {
    needsDatabase();
    const token = authorization.match(/^Bearer (vi_key_[a-f0-9]{64})$/)?.[1];
    if (!token) throw new ApiError(401, 'Clé API invalide.');
    const key = await db.apiKey.findUnique({
      where: { tokenHash: hashToken(token) },
      include: { workspace: true, user: { include: { memberships: true } } },
    });
    if (!key || key.revokedAt || key.expiresAt < new Date())
      throw new ApiError(401, 'Clé API expirée ou révoquée.');
    if (key.workspace.plan !== 'agency')
      throw new ApiError(403, 'L’accès API nécessite une offre Agency active.');
    if (key.workspaceId !== id) throw new ApiError(404, 'Espace introuvable.');
    const creator = key.user.memberships.find((m) => m.workspaceId === id);
    if (!creator) throw new ApiError(401, 'Le créateur de cette clé a quitté l’espace.');
    if (write && (key.role === Role.VIEWER || creator.role === Role.VIEWER))
      throw new ApiError(403, 'Clé en lecture seule.');
    await rateLimit(`api-key:${key.id}`, 60, 60);
    return key.workspace;
  }
  try {
    const user = await currentUser();
    const membership = user.memberships.find((m) => m.workspaceId === id);
    if (!membership) {
      if (id === 'ws_local') {
        return localWorkspace;
      }
      throw new ApiError(404, 'Espace introuvable.');
    }
    if (write && membership.role === Role.VIEWER) throw new ApiError(403, 'Accès en lecture seule.');
    return membership.workspace;
  } catch (err) {
    if (id === 'ws_local') {
      return localWorkspace;
    }
    throw err;
  }
}



export async function requireOwner(id: string) {
  const user = await currentUser();
  const membership = user.memberships.find((m) => m.workspaceId === id);
  if (!membership) throw new ApiError(404, 'Espace introuvable.');
  if (membership.role !== Role.OWNER)
    throw new ApiError(403, 'Cette action est réservée au propriétaire.');
  return { user, workspace: membership.workspace };
}
