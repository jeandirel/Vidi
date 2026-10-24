import Redis from 'ioredis';
import { ApiError } from './api';
/** Rate limit by hashed email/account; never trust an arbitrary forwarded IP. Fails closed. */
export async function rateLimit(key: string, limit = 10, window = 60) {
  if (!process.env.REDIS_URL)
    throw new ApiError(503, 'Redis doit être connecté pour sécuriser les opérations cloud.');
  const redis = new Redis(process.env.REDIS_URL, {
    maxRetriesPerRequest: 1,
    connectTimeout: 3000,
    lazyConnect: true,
  });
  try {
    const count = Number(
      await redis.eval(
        "local n=redis.call('INCR',KEYS[1]); if n==1 then redis.call('EXPIRE',KEYS[1],ARGV[1]) end; return n",
        1,
        `vidi:limit:${key}`,
        window,
      ),
    );
    if (count > limit) throw new ApiError(429, 'Trop de demandes. Réessayez dans une minute.');
  } finally {
    redis.disconnect();
  }
}
