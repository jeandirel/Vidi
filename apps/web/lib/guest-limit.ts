import { ApiError } from './api';
// Local fallback for the private prototype; distributed limits take over when Redis is configured.
const counters = { minute: { window: 0, count: 0 }, day: { window: 0, count: 0 } };
export function guestLimit(now = Date.now()) {
  for (const [bucket, period, max] of [
    [counters.minute, 60000, 10],
    [counters.day, 86400000, 100],
  ] as const) {
    const window = Math.floor(now / period);
    if (bucket.window !== window) {
      bucket.window = window;
      bucket.count = 0;
    }
    if (bucket.count >= max)
      throw new ApiError(429, 'La limite de cet essai gratuit est atteinte. Réessayez plus tard.');
  }
  counters.minute.count++;
  counters.day.count++;
}
