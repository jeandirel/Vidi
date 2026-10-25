import { createHash } from 'node:crypto';
import Redis from 'ioredis';
import { db } from '@vidi/db';
import { ApiError } from './api';
/** Shared quotas: Redis when configured, otherwise atomic Postgres counters. Never trust a forwarded IP. */
export async function rateLimit(key: string, limit = 10, window = 60) {
  if (!Number.isSafeInteger(limit) || limit < 1 || !Number.isSafeInteger(window) || window < 1)
    throw new Error('Invalid rate limit');
  if (!process.env.REDIS_URL) {
    if (!process.env.DATABASE_URL)
      throw new ApiError(
        503,
        'La base de données doit être connectée pour sécuriser les opérations cloud.',
      );
    const bucket = createHash('sha256').update(`${window}:${key}`).digest('hex');
    // ON CONFLICT locks the counter row: concurrent instances share the same quota.
    const counters = await db.$queryRaw<{ count: number }[]>`
      INSERT INTO "RateLimitBucket" ("key", "count", "expiresAt")
      VALUES (${bucket}, 1, NOW() + ${window} * INTERVAL '1 second')
      ON CONFLICT ("key") DO UPDATE SET
        "count" = CASE WHEN "RateLimitBucket"."expiresAt" <= NOW() THEN 1
          ELSE LEAST("RateLimitBucket"."count", ${limit}) + 1 END,
        "expiresAt" = CASE WHEN "RateLimitBucket"."expiresAt" <= NOW()
          THEN NOW() + ${window} * INTERVAL '1 second' ELSE "RateLimitBucket"."expiresAt" END
      RETURNING "count"
    `;
    if (!counters[0]) throw new ApiError(503, 'Le contrôle des quotas est indisponible.');
    // Separate transaction avoids locking other buckets while upserting this one.
    // Cleanup is bounded and skips rows held by other requests.
    await db.$executeRaw`
      DELETE FROM "RateLimitBucket" WHERE "key" IN (
        SELECT "key" FROM "RateLimitBucket" WHERE "expiresAt" < NOW()
        ORDER BY "expiresAt" LIMIT 100 FOR UPDATE SKIP LOCKED
      )
    `.catch(() => console.error('Quota cleanup unavailable'));
    if (counters[0].count > limit)
      throw new ApiError(429, 'Trop de demandes. Réessayez après la fin de la période.');
    return;
  }
  // A configured Redis outage fails closed; switching stores mid-window would reset quotas.
  const redis = new Redis(process.env.REDIS_URL, {
    maxRetriesPerRequest: 1,
    connectTimeout: 3000,
    lazyConnect: true,
  });
  redis.on('error', () => console.error('Rate limiting service unavailable'));
  try {
    const count = Number(
      await redis.eval(
        "local n=redis.call('INCR',KEYS[1]); if n==1 then redis.call('EXPIRE',KEYS[1],ARGV[1]) end; return n",
        1,
        `vidi:limit:${key}`,
        window,
      ),
    );
    if (count > limit)
      throw new ApiError(429, 'Trop de demandes. Réessayez après la fin de la période.');
  } finally {
    redis.disconnect();
  }
}
