import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { load } from 'cheerio';
import { z } from 'zod';
import { ApiError } from './api';
import { productUrl } from './product-fetch';
import { remoteJson } from './remote-json';
export const connectionSchema = z.object({
  workspaceId: z.string().min(1),
  provider: z.enum(['shopify', 'woocommerce', 'youtube']),
  url: z.string().max(2000).default(''),
  region: z
    .string()
    .regex(/^[A-Z]{2}$/)
    .default('FR'),
  secret: z.string().trim().min(20).max(250).optional(),
});
export type Provider = z.infer<typeof connectionSchema>['provider'];
export function integrationKey() {
  const key = process.env.VIDI_INTEGRATION_KEY || '';
  if (!/^[a-f0-9]{64}$/.test(key))
    throw new ApiError(503, 'Le chiffrement des connexions doit être configuré.');
  return Buffer.from(key, 'hex');
}
export function sealSecret(secret: string, context: string) {
  const iv = randomBytes(12),
    cipher = createCipheriv('aes-256-gcm', integrationKey(), iv);
  cipher.setAAD(Buffer.from(context));
  const value = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]);
  return [
    'v1',
    iv.toString('hex'),
    cipher.getAuthTag().toString('hex'),
    value.toString('hex'),
  ].join(':');
}
export function openSecret(secret: string, context: string) {
  try {
    const [version, iv, tag, data] = secret.split(':');
    if (version !== 'v1' || iv.length !== 24 || tag.length !== 32) throw new Error('format');
    const decipher = createDecipheriv('aes-256-gcm', integrationKey(), Buffer.from(iv, 'hex'));
    decipher.setAAD(Buffer.from(context));
    decipher.setAuthTag(Buffer.from(tag, 'hex'));
    return Buffer.concat([decipher.update(Buffer.from(data, 'hex')), decipher.final()]).toString(
      'utf8',
    );
  } catch {
    throw new ApiError(503, 'Impossible de déchiffrer cette connexion. Reconnectez ce service.');
  }
}
export function storeBase(value: string) {
  const url = productUrl(value);
  if (url.search || url.pathname !== '/')
    throw new ApiError(400, 'Indiquez l’adresse racine de la boutique, sans chemin ni paramètres.');
  return url.origin;
}
const https = (value: unknown) => {
  try {
    const u = new URL(String(value));
    return u.protocol === 'https:' && !u.username && !u.password ? u.href.slice(0, 2000) : '';
  } catch {
    return '';
  }
};
const plain = (value: unknown, max: number) =>
  load(String(value || '').slice(0, 30000))
    .text()
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
export type CatalogItem = {
  id: string;
  name: string;
  description: string;
  url: string;
  image: string;
  price: string;
  currency: string;
};
export async function catalog(
  provider: 'shopify' | 'woocommerce',
  base: string,
  search = '',
  cursor = '',
) {
  const origin = storeBase(base);
  if (provider === 'shopify') {
    const raw = await remoteJson(origin + '/api/2026-10/graphql.json', {
      query:
        'query VidiProducts($after:String,$query:String){products(first:20,after:$after,query:$query){nodes{id title description onlineStoreUrl featuredImage{url} priceRange{minVariantPrice{amount currencyCode}}}pageInfo{hasNextPage endCursor}}}',
      variables: { after: cursor || null, query: search || null },
    });
    const node = z.object({
      id: z.string().max(200),
      title: z.string(),
      description: z.string(),
      onlineStoreUrl: z.string().nullable(),
      featuredImage: z.object({ url: z.string() }).nullable(),
      priceRange: z.object({
        minVariantPrice: z.object({
          amount: z
            .string()
            .regex(/^\d+(?:\.\d+)?$/)
            .max(40),
          currencyCode: z.string(),
        }),
      }),
    });
    const result = z
      .object({
        data: z.object({
          products: z.object({
            nodes: z.array(node).max(20),
            pageInfo: z.object({ hasNextPage: z.boolean(), endCursor: z.string().nullable() }),
          }),
        }),
      })
      .safeParse(raw);
    if (!result.success)
      throw new ApiError(422, 'L’API Storefront Shopify ne permet pas cette lecture publique.');
    const products = result.data.data.products;
    return {
      items: products.nodes.map((p) => ({
        id: p.id,
        name: plain(p.title, 120),
        description: plain(p.description, 4000),
        url: https(p.onlineStoreUrl),
        image: https(p.featuredImage?.url),
        price: p.priceRange.minVariantPrice.amount.slice(0, 40),
        currency: p.priceRange.minVariantPrice.currencyCode.slice(0, 8),
      })),
      cursor: products.pageInfo.hasNextPage ? products.pageInfo.endCursor : null,
    };
  }
  const page = cursor ? Number(cursor) : 1;
  if (!Number.isInteger(page) || page < 1 || page > 1000)
    throw new ApiError(400, 'Pagination invalide.');
  const url = new URL(origin + '/wp-json/wc/store/v1/products');
  url.search = new URLSearchParams({ per_page: '20', page: String(page), search }).toString();
  const parsed = z
    .array(
      z.object({
        id: z.number().int().positive(),
        name: z.string(),
        description: z.string(),
        short_description: z.string().optional(),
        permalink: z.string(),
        images: z.array(z.object({ src: z.string() })).max(100),
        prices: z.object({
          price: z.string().regex(/^\d+$/).max(20),
          currency_code: z.string().max(8),
          currency_minor_unit: z.number().int().min(0).max(6),
        }),
      }),
    )
    .max(20)
    .safeParse(await remoteJson(url.href));
  if (!parsed.success) throw new ApiError(422, 'Réponse WooCommerce incompatible.');
  return {
    items: parsed.data.map((p) => ({
      id: String(p.id),
      name: plain(p.name, 120),
      description: plain(p.description || p.short_description, 4000),
      url: https(p.permalink),
      image: https(p.images[0]?.src),
      price: (Number(p.prices.price) / 10 ** p.prices.currency_minor_unit).toFixed(
        p.prices.currency_minor_unit,
      ),
      currency: p.prices.currency_code,
    })),
    cursor: parsed.data.length === 20 ? String(page + 1) : null,
  };
}
export async function reviews(base: string, productId: string) {
  if (!/^\d{1,12}$/.test(productId)) throw new ApiError(400, 'Identifiant produit invalide.');
  const raw = await remoteJson(
    storeBase(base) +
      '/wp-json/wc/store/v1/products/reviews?' +
      new URLSearchParams({ product_id: productId, per_page: '10', orderby: 'date' }),
  );
  const parsed = z
    .array(
      z.object({
        id: z.number(),
        review: z.string(),
        rating: z.number().min(0).max(5),
        date_created: z.string().optional(),
      }),
    )
    .max(10)
    .safeParse(raw);
  if (!parsed.success) throw new ApiError(422, 'Avis indisponibles.');
  return parsed.data.map((r) => ({
    id: String(r.id),
    text: plain(r.review, 1200),
    rating: r.rating,
    date: r.date_created || '',
  }));
}
export async function youtubeTrends(key: string, region: string) {
  const url = new URL('https://www.googleapis.com/youtube/v3/videos');
  url.search = new URLSearchParams({
    part: 'snippet,statistics',
    chart: 'mostPopular',
    regionCode: region,
    maxResults: '20',
  }).toString();
  const response = await fetch(url, {
    headers: { 'X-Goog-Api-Key': key },
    cache: 'no-store',
    redirect: 'error',
    signal: AbortSignal.timeout(12000),
  });
  if (!response.ok)
    throw new ApiError(
      422,
      'YouTube a refusé la requête : vérifiez la clé, la région et le quota API.',
    );
  const parsed = z
    .object({
      items: z
        .array(
          z.object({
            id: z.string().regex(/^[A-Za-z0-9_-]{11}$/),
            snippet: z.object({
              title: z.string().max(1000),
              channelTitle: z.string().max(500),
              publishedAt: z.string(),
            }),
            statistics: z
              .object({ viewCount: z.string().regex(/^\d+$/).max(30).optional() })
              .optional(),
          }),
        )
        .max(20),
    })
    .safeParse(await response.json());
  if (!parsed.success) throw new ApiError(502, 'Réponse YouTube invalide.');
  return {
    provider: 'youtube' as const,
    region,
    fetchedAt: new Date().toISOString(),
    scope:
      'Populaires YouTube : musique, cinéma et gaming ; ce classement n’est pas un classement UGC/TikTok.',
    items: parsed.data.items.map((v) => ({
      id: v.id,
      title: v.snippet.title,
      channel: v.snippet.channelTitle,
      publishedAt: v.snippet.publishedAt,
      views: v.statistics?.viewCount || null,
      url: `https://www.youtube.com/watch?v=${v.id}`,
    })),
  };
}
