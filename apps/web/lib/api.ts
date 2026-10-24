import { z } from 'zod';
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export async function jsonBody(request: Request) {
  if (Number(request.headers.get('content-length') || 0) > 2_000_000)
    throw new ApiError(413, 'Requête trop volumineuse.');
  const reader = request.body?.getReader();
  if (!reader) throw new ApiError(400, 'Corps JSON requis.');
  let text = '',
    bytes = 0;
  const decoder = new TextDecoder();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > 2_000_000) {
        await reader.cancel();
        throw new ApiError(413, 'Requête trop volumineuse.');
      }
      text += decoder.decode(value, { stream: true });
    }
    text += decoder.decode();
    return JSON.parse(text) as unknown;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(400, 'JSON invalide.');
  }
}
export function checkOrigin(request: Request) {
  const origin = request.headers.get('origin');
  if (!origin || origin !== new URL(request.url).origin)
    throw new ApiError(403, 'Origine non autorisée.');
}
export function errorResponse(error: unknown) {
  if (error instanceof ApiError)
    return Response.json({ error: error.message }, { status: error.status });
  if (error instanceof z.ZodError)
    return Response.json(
      { error: 'Données invalides.', details: error.flatten() },
      { status: 400 },
    );
  console.error('Vidi API failure', { type: error instanceof Error ? error.name : 'unknown' });
  return Response.json({ error: 'Service temporairement indisponible.' }, { status: 503 });
}
export function needsDatabase() {
  if (!process.env.DATABASE_URL)
    throw new ApiError(
      503,
      'La base de données doit être connectée pour utiliser les espaces cloud. Vos brouillons restent disponibles sur cet appareil.',
    );
}
