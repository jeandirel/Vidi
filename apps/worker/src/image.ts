import { lookup } from 'node:dns/promises';
import { request } from 'node:https';
import ipaddr from 'ipaddr.js';
export function imageUrl(value: string) {
  const url = new URL(value);
  const hostname = url.hostname.replace(/^\[|\]$/g, '');
  if (
    url.protocol !== 'https:' ||
    url.username ||
    url.password ||
    url.href.length > 2000 ||
    (url.port && url.port !== '443') ||
    ipaddr.isValid(hostname) ||
    !hostname.includes('.')
  )
    throw new Error('Unsupported public product image URL');
  return url;
}
export function publicImageAddress(address: string) {
  try {
    return ipaddr.process(address).range() === 'unicast';
  } catch {
    return false;
  }
}
export async function productImage(value: string): Promise<string> {
  if (!value || value.startsWith('data:')) return value;
  const signal = AbortSignal.timeout(12000);
  const operation = async (url: URL, redirects: number): Promise<string> => {
    const addresses = await lookup(url.hostname, { all: true, verbatim: true });
    signal.throwIfAborted();
    if (!addresses.length || addresses.some((a) => !publicImageAddress(a.address)))
      throw new Error('Private image address denied');
    const pinned = addresses[0];
    return new Promise((resolve, reject) => {
      const req = request(
        url,
        {
          signal,
          family: pinned.family,
          lookup: (_host, _options, cb) => cb(null, pinned.address, pinned.family),
          headers: {
            Accept: 'image/png,image/jpeg,image/webp',
            'Accept-Encoding': 'identity',
            'User-Agent': 'VidiMedia/1.0',
          },
        },
        (res) => {
          const status = res.statusCode || 0;
          if (status >= 300 && status < 400) {
            res.destroy();
            if (!res.headers.location || redirects >= 3) {
              reject(new Error('Image redirect limit'));
              return;
            }
            try {
              operation(imageUrl(new URL(res.headers.location, url).href), redirects + 1).then(
                resolve,
                reject,
              );
            } catch {
              reject(new Error('Invalid image redirect'));
            }
            return;
          }
          const mime = res.headers['content-type']?.split(';')[0];
          if (
            status !== 200 ||
            !mime ||
            !['image/png', 'image/jpeg', 'image/webp'].includes(mime) ||
            (res.headers['content-encoding'] && res.headers['content-encoding'] !== 'identity')
          ) {
            res.destroy();
            reject(new Error('Unsupported image response'));
            return;
          }
          let size = 0;
          const chunks: Buffer[] = [];
          res.on('data', (chunk: Buffer) => {
            size += chunk.length;
            if (size > 1024 * 1024) {
              res.destroy();
              reject(new Error('Image exceeds 1 MiB'));
            } else chunks.push(chunk);
          });
          res.on('error', reject);
          res.on('end', () =>
            resolve(`data:${mime};base64,${Buffer.concat(chunks).toString('base64')}`),
          );
        },
      );
      req.on('error', reject);
      req.end();
    });
  };
  return Promise.race([
    operation(imageUrl(value), 0),
    new Promise<never>((_, reject) =>
      signal.addEventListener('abort', () => reject(new Error('Image timeout')), { once: true }),
    ),
  ]);
}
