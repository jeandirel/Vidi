import { lookup } from 'node:dns/promises';
import { request } from 'node:https';
import ipaddr from 'ipaddr.js';
import { ApiError } from './api';

const MAX_BYTES = 1024 * 1024;
const MAX_BYTES_AMAZON = 4 * 1024 * 1024;
const TIMEOUT = 12000;
export function publicAddress(address: string): boolean {
  try {
    const parsed = ipaddr.process(address);
    return parsed.range() === 'unicast';
  } catch {
    return false;
  }
}
export function productUrl(value: string): URL {
  let u: URL;
  try {
    u = new URL(value);
  } catch {
    throw new ApiError(400, 'Lien produit invalide.');
  }
  if (
    u.protocol !== 'https:' ||
    (u.port && u.port !== '443') ||
    u.username ||
    u.password ||
    u.href.length > 2000
  )
    throw new ApiError(
      400,
      'Utilisez un lien HTTPS public sans identifiants et sur le port standard.',
    );
  const name = u.hostname.toLowerCase().replace(/\.$/, '');
  if (
    !name.includes('.') ||
    /(?:^|\.)(?:localhost|local|internal|test|invalid|example|home|lan)$/.test(name)
  )
    throw new ApiError(400, 'Ce domaine n’est pas une boutique publique.');
  // Reject IP literals, including unusual numeric IPv4 representations normalized by URL.
  if (ipaddr.isValid(name.replace(/^\[|\]$/g, '')))
    throw new ApiError(400, 'Utilisez le nom de domaine public de la boutique.');
  u.hash = '';
  return u;
}
type Hop = { status: number; location?: string; type: string; html: string };
async function readHop(url: URL, signal: AbortSignal): Promise<Hop> {
  signal.throwIfAborted();
  const addresses = await lookup(url.hostname, { all: true, verbatim: true });
  signal.throwIfAborted();
  if (!addresses.length || addresses.some((a) => !publicAddress(a.address)))
    throw new ApiError(400, 'Ce lien pointe vers une adresse réseau non autorisée.');
  const pinned = addresses[0];
  const isAmazon = /(?:^|\.)(?:amazon\.[a-z.]+|amzn\.eu)$/i.test(url.hostname);
  const limitBytes = isAmazon ? MAX_BYTES_AMAZON : MAX_BYTES;
  return new Promise((resolve, reject) => {
    const req = request(
      url,
      {
        method: 'GET',
        signal,
        family: pinned.family,
        // DNS is resolved once and the checked address is pinned to the TLS connection.
        // The original hostname remains in Host and TLS SNI for certificate verification.
        lookup: (_hostname, _options, callback) => callback(null, pinned.address, pinned.family),
        headers: {
          'User-Agent': isAmazon
            ? 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)'
            : 'VidiProductImporter/1.0',
          Accept: 'text/html,application/xhtml+xml',
          'Accept-Encoding': 'identity',
        },
      },
      (res) => {
        const status = res.statusCode || 502;
        if (status >= 300 && status < 400) {
          res.destroy();
          resolve({ status, location: res.headers.location, type: '', html: '' });
          return;
        }
        const type = res.headers['content-type'] || '';
        if (status !== 200 || !/^(text\/html|application\/xhtml\+xml)(?:;|$)/i.test(type)) {
          res.destroy();
          reject(
            new ApiError(422, 'Cette fiche n’est pas accessible sous forme de page HTML publique.'),
          );
          return;
        }
        if (res.headers['content-encoding'] && res.headers['content-encoding'] !== 'identity') {
          res.destroy();
          reject(
            new ApiError(422, 'Cette boutique impose un format de réponse non pris en charge.'),
          );
          return;
        }
        if (Number(res.headers['content-length'] || 0) > limitBytes) {
          res.destroy();
          reject(new ApiError(413, 'La fiche produit est trop volumineuse.'));
          return;
        }
        let size = 0;
        const chunks: Buffer[] = [];
        res.on('data', (chunk: Buffer) => {
          size += chunk.length;
          if (size > limitBytes) {
            res.destroy();
            reject(new ApiError(413, 'La fiche produit est trop volumineuse.'));
          } else chunks.push(chunk);
        });
        res.on('error', reject);
        res.on('end', () =>
          resolve({ status, type, html: Buffer.concat(chunks).toString('utf8') }),
        );
      },
    );
    req.on('error', reject);
    req.end();
  });
}
export async function fetchProductPage(value: string): Promise<{ html: string; url: string }> {
  let url = productUrl(value);
  const signal = AbortSignal.timeout(TIMEOUT);
  try {
    // Includes DNS resolution in the overall deadline, even if the resolver stalls.
    return await Promise.race([
      (async () => {
        for (let redirects = 0; redirects <= 3; redirects++) {
          const hop = await readHop(url, signal);
          if (hop.status === 200) return { html: hop.html, url: url.href };
          if (!hop.location || redirects === 3)
            throw new ApiError(422, 'Trop de redirections pour cette fiche produit.');
          url = productUrl(new URL(hop.location, url).href);
        }
        throw new ApiError(422, 'Import impossible.');
      })(),
      new Promise<never>((_, reject) =>
        signal.addEventListener(
          'abort',
          () => reject(new ApiError(504, 'La boutique met trop de temps à répondre.')),
          { once: true },
        ),
      ),
    ]);
  } catch (e) {
    if (e instanceof ApiError) throw e;
    throw new ApiError(
      422,
      'Cette boutique ne permet pas l’import. Vous pouvez saisir la fiche manuellement.',
    );
  }
}
