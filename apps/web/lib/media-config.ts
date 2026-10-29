import { storageConfigured } from './storage';
export function mediaConfigured() {
  return !!(
    process.env.MEDIA_GATEWAY_URL &&
    process.env.MEDIA_GATEWAY_TOKEN &&
    process.env.REDIS_URL &&
    storageConfigured()
  );
}
export function videoConfigured() {
  // All actual renders are dispatched through the durable queue; no fire-and-forget.
  if (!process.env.DATABASE_URL || !process.env.REDIS_URL) return false;
  const omniReady = !!(
    process.env.GEMINI_API_KEY &&
    process.env.S3_BUCKET &&
    process.env.AWS_ACCESS_KEY_ID &&
    process.env.AWS_SECRET_ACCESS_KEY
  );
  return (
    omniReady ||
    !!process.env.HEYGEN_API_KEY ||
    mediaConfigured() ||
    !!(
      process.env.VIDEO_GATEWAY_URL &&
      process.env.VIDEO_GATEWAY_TOKEN &&
      process.env.VIDEO_OUTPUT_HOSTS
    )
  );
}

export async function mediaCapabilities() {
  if (!mediaConfigured()) return null;
  try {
    const url = new URL(process.env.MEDIA_GATEWAY_URL!);
    if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash)
      return null;
    url.pathname = url.pathname.replace(/\/$/, '') + '/health';
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${process.env.MEDIA_GATEWAY_TOKEN}` },
      cache: 'no-store',
      redirect: 'error',
      signal: AbortSignal.timeout(2500),
    });
    if (!response.ok) return null;
    const result = (await response.json()) as Record<string, unknown>;
    return {
      product: result.product === true,
      tts: result.tts === true,
      avatar: result.avatar === true,
      actors: Array.isArray(result.actors)
        ? result.actors.filter((a): a is string => typeof a === 'string')
        : [],
      voices: Array.isArray(result.voices)
        ? result.voices.filter((a): a is string => typeof a === 'string')
        : [],
    };
  } catch {
    return null;
  }
}
