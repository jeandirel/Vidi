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
  return (
    mediaConfigured() ||
    !!(
      process.env.VIDEO_GATEWAY_URL &&
      process.env.VIDEO_GATEWAY_TOKEN &&
      process.env.VIDEO_OUTPUT_HOSTS &&
      process.env.REDIS_URL
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
