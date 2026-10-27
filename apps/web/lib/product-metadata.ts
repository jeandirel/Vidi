import { load } from 'cheerio';
import { ApiError } from './api';
import { productUrl } from './product-fetch';

export type ImportedProduct = {
  name: string;
  description: string;
  image: string;
  url: string;
  source: 'structured-data' | 'metadata';
  notes: string[];
};
type JsonObject = Record<string, unknown>;
function object(value: unknown): value is JsonObject {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}
function clean(value: unknown, max: number): string {
  if (typeof value !== 'string') return '';
  const $ = load(value.slice(0, 20000));
  $('script, style, noscript').remove();
  return $.text().replace(/\s+/g, ' ').trim().slice(0, max);
}
function products(value: unknown, depth = 0): JsonObject[] {
  if (depth > 8) return [];
  if (Array.isArray(value)) return value.slice(0, 100).flatMap((v) => products(v, depth + 1));
  if (!object(value)) return [];
  const types = Array.isArray(value['@type']) ? value['@type'] : [value['@type']];
  const matches = types.some((t) => typeof t === 'string' && /(?:^|[/#])Product$/.test(t));
  if (matches) return [value];
  return ['@graph', 'mainEntity', 'itemListElement', 'item'].flatMap((key) =>
    products(value[key], depth + 1),
  );
}
export function extractProduct(html: string, finalUrl: string): ImportedProduct {
  const $ = load(html);
  const candidates: JsonObject[] = [];
  $('script[type="application/ld+json"]').each((_, node) => {
    const raw = $(node).text();
    if (raw.length > 200000) return;
    try {
      candidates.push(...products(JSON.parse(raw)));
    } catch {
      /* Malformed metadata is ignored. */
    }
  });
  const canonical = new URL(finalUrl);
  canonical.hash = '';
  const matching = candidates.filter((p) => {
    if (typeof p.url !== 'string') return false;
    try {
      const u = new URL(p.url, finalUrl);
      u.hash = '';
      return u.href === canonical.href;
    } catch {
      return false;
    }
  });
  const unique = new Map(candidates.map((p) => [JSON.stringify([p.name, p.url]), p]));
  const structured =
    matching.length === 1 ? matching[0] : unique.size === 1 ? [...unique.values()][0] : undefined;
  if (unique.size > 1 && !structured)
    throw new ApiError(
      422,
      'Cette page contient plusieurs produits. Utilisez le lien direct d’une fiche produit.',
    );
  function meta(key: string) {
    return $(`meta[property="${key}"], meta[name="${key}"]`).first().attr('content') || '';
  }
  const isAmazon = /(?:^|\.)(?:amazon\.[a-z.]+|amzn\.eu)$/i.test(canonical.hostname);
  const amazonBullets = isAmazon
    ? $('#feature-bullets li span.a-list-item')
        .map((_, el) => $(el).text().trim())
        .get()
        .filter((t) => t.length > 10 && !t.includes('Amazon'))
        .slice(0, 4)
    : [];

  const candidateTitle =
    (typeof structured?.name === 'string' ? structured.name : '') ||
    meta('og:title') ||
    $('#productTitle').text() ||
    $('title').first().text();
  let cleanTitle = candidateTitle;
  if (isAmazon) {
    cleanTitle = cleanTitle.replace(/\s*:\s*Amazon\.[a-z.]+(?::.*)?$/i, '').trim();
  }
  const name = clean(cleanTitle, 120);

  let rawDesc = typeof structured?.description === 'string' ? structured.description : '';
  if (!rawDesc && amazonBullets.length > 0) {
    rawDesc = amazonBullets.join('\n\n');
  }
  if (!rawDesc) {
    rawDesc = meta('og:description') || meta('description') || $('#productDescription').text();
  }
  const description = clean(rawDesc, 4000);
  if (name.length < 2)
    throw new ApiError(
      422,
      'Aucune fiche exploitable trouvée. Renseignez les informations manuellement.',
    );
  let rawImage: unknown = structured?.image;
  if (!rawImage && isAmazon) {
    rawImage =
      $('#landingImage').attr('data-old-hires') ||
      $('#landingImage').attr('src') ||
      meta('og:image');
  } else if (!rawImage) {
    rawImage = meta('og:image');
  }
  if (Array.isArray(rawImage)) rawImage = rawImage[0];
  if (object(rawImage)) rawImage = rawImage.url || rawImage.contentUrl;
  let image = '';
  if (typeof rawImage === 'string') {
    try {
      const u = productUrl(new URL(rawImage, finalUrl).href);
      image = u.href;
    } catch {
      /* No usable image. */
    }
  }
  return {
    name,
    description,
    image,
    url: canonical.href,
    source: structured ? 'structured-data' : 'metadata',
    notes: [
      isAmazon
        ? 'Fiche produit importée directement depuis Amazon.'
        : 'Vérifiez les informations et les droits d’utilisation de l’image avant de les appliquer.',
      ...(description.length < 10
        ? ['La description est absente ou trop courte : complétez-la dans le studio.']
        : []),
      ...(!structured && !isAmazon
        ? ['Informations issues des métadonnées de la page : vérifiez qu’il s’agit du bon produit.']
        : []),
    ],
  };
}
