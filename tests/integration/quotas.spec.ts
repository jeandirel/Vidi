import { test, expect } from '@playwright/test';
import { createHash, randomUUID } from 'node:crypto';
import { db } from '../../packages/db/src';
import { rateLimit } from '../../apps/web/lib/rate-limit';

test.afterAll(() => db.$disconnect());
test('PostgreSQL quotas stay shared under concurrency and reset only after expiry', async () => {
  const redis = process.env.REDIS_URL;
  delete process.env.REDIS_URL;
  const key = `integration:${randomUUID()}`;
  const bucket = createHash('sha256').update(`60:${key}`).digest('hex');
  const other = createHash('sha256').update(`60:${key}:other`).digest('hex');
  const expired = createHash('sha256').update(`60:${key}:expired`).digest('hex');
  try {
    await db.rateLimitBucket.create({ data: { key: expired, count: 3, expiresAt: new Date(0) } });
    const requests = await Promise.allSettled(
      Array.from({ length: 12 }, () => rateLimit(key, 4, 60)),
    );
    expect(requests.filter((r) => r.status === 'fulfilled')).toHaveLength(4);
    const rejected = requests.filter((r): r is PromiseRejectedResult => r.status === 'rejected');
    expect(rejected).toHaveLength(8);
    expect(rejected.every((r) => r.reason.status === 429)).toBe(true);
    expect(await db.rateLimitBucket.findUnique({ where: { key: expired } })).toBeNull();
    await expect(rateLimit(`${key}:other`, 4, 60)).resolves.toBeUndefined();
    await db.rateLimitBucket.update({ where: { key: bucket }, data: { expiresAt: new Date(0) } });
    await expect(rateLimit(key, 4, 60)).resolves.toBeUndefined();
    expect((await db.rateLimitBucket.findUniqueOrThrow({ where: { key: bucket } })).count).toBe(1);
  } finally {
    if (redis === undefined) delete process.env.REDIS_URL;
    else process.env.REDIS_URL = redis;
    await db.rateLimitBucket.deleteMany({ where: { key: { in: [bucket, other, expired] } } });
  }
});
