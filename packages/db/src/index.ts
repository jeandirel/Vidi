import { PrismaClient } from '@prisma/client';
export { Prisma, Role, RenderStatus } from '@prisma/client';
const globalDb = globalThis as unknown as { vidiDb?: PrismaClient };
export const db = globalDb.vidiDb ?? new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalDb.vidiDb = db;
