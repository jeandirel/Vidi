import { lookup } from 'node:dns/promises';
import { request } from 'node:https';
import { ApiError } from './api';
import { productUrl, publicAddress } from './product-fetch';
/** No redirects, identity encoding and checked DNS pinned to TLS, including POST requests. */
export async function remoteJson(value: string, body?: unknown): Promise<unknown> {
  const url = productUrl(value);
  const signal = AbortSignal.timeout(12000);
  const operation = (async () => {
    const addresses = await lookup(url.hostname, { all: true, verbatim: true });
    signal.throwIfAborted();
    if (!addresses.length || addresses.some((a) => !publicAddress(a.address)))
      throw new ApiError(400, 'Adresse réseau non autorisée.');
    const pinned = addresses[0];
    const payload = body === undefined ? undefined : JSON.stringify(body);
    return new Promise<unknown>((resolve, reject) => {
      const req = request(
        url,
        {
          method: payload ? 'POST' : 'GET',
          signal,
          family: pinned.family,
          lookup: (_host, _opts, cb) => cb(null, pinned.address, pinned.family),
          headers: {
            Accept: 'application/json',
            'Accept-Encoding': 'identity',
            'User-Agent': 'VidiCatalog/1.0',
            ...(payload
              ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) }
              : {}),
          },
        },
        (res) => {
          if (
            res.statusCode !== 200 ||
            !/^application\/(?:[\w.+-]*\+)?json(?:;|$)/i.test(res.headers['content-type'] || '') ||
            (res.headers['content-encoding'] && res.headers['content-encoding'] !== 'identity')
          ) {
            res.destroy();
            reject(new ApiError(422, 'L’API publique de cette boutique est indisponible.'));
            return;
          }
          let size = 0;
          const chunks: Buffer[] = [];
          res.on('data', (chunk: Buffer) => {
            size += chunk.length;
            if (size > 1024 * 1024) {
              res.destroy();
              reject(new ApiError(413, 'Réponse boutique trop volumineuse.'));
            } else chunks.push(chunk);
          });
          res.on('error', reject);
          res.on('end', () => {
            try {
              resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
            } catch {
              reject(new ApiError(422, 'Réponse boutique invalide.'));
            }
          });
        },
      );
      req.on('error', reject);
      req.end(payload);
    });
  })();
  try {
    return await Promise.race([
      operation,
      new Promise<never>((_, reject) =>
        signal.addEventListener(
          'abort',
          () => reject(new ApiError(504, 'Le service distant met trop de temps à répondre.')),
          { once: true },
        ),
      ),
    ]);
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(422, 'Connexion au catalogue impossible.');
  }
}
