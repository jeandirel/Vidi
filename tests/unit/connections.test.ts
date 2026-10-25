import {
  catalog,
  reviews,
  openSecret,
  sealSecret,
  storeBase,
  youtubeTrends,
} from '../../apps/web/lib/connections';
import { remoteJson } from '../../apps/web/lib/remote-json';
jest.mock('../../apps/web/lib/remote-json', () => ({ remoteJson: jest.fn() }));
const env = { ...process.env };
afterEach(() => {
  process.env = { ...env };
  jest.restoreAllMocks();
  jest.clearAllMocks();
});
test('integration credentials are authenticated, randomized and bound to the workspace and provider', () => {
  process.env.VIDI_INTEGRATION_KEY = '11'.repeat(32);
  const value = sealSecret('private-api-key', 'space:youtube');
  expect(value).not.toContain('private-api-key');
  expect(openSecret(value, 'space:youtube')).toBe('private-api-key');
  expect(sealSecret('private-api-key', 'space:youtube')).not.toBe(value);
  expect(() => openSecret(value, 'other-space:youtube')).toThrow('déchiffrer');
  expect(() =>
    openSecret(value.slice(0, -2) + (value.endsWith('00') ? '01' : '00'), 'space:youtube'),
  ).toThrow();
  delete process.env.VIDI_INTEGRATION_KEY;
  expect(() => sealSecret('key', 'space:youtube')).toThrow('chiffrement');
});
test.each([
  'http://shop.com',
  'https://127.0.0.1',
  'https://user:secret@shop.com',
  'https://shop.com/products',
  'https://shop.com/?token=secret',
])('store connection rejects unsafe or ambiguous root URL %s', (url) =>
  expect(() => storeBase(url)).toThrow(),
);
test('Shopify uses tokenless POST, stable API, variables, validated prices and cursor pagination', async () => {
  jest
    .mocked(remoteJson)
    .mockResolvedValue({
      data: {
        products: {
          nodes: [
            {
              id: 'gid://shopify/Product/1',
              title: 'Lumé',
              description: 'Un flacon rechargeable.',
              onlineStoreUrl: 'https://shop.com/p',
              featuredImage: { url: 'https://cdn.shop.com/p.jpg' },
              priceRange: { minVariantPrice: { amount: '12.50', currencyCode: 'EUR' } },
            },
          ],
          pageInfo: { hasNextPage: true, endCursor: 'next' },
        },
      },
    });
  const result = await catalog('shopify', 'https://shop.com', 'Lumé', 'previous');
  expect(remoteJson).toHaveBeenCalledWith(
    'https://shop.com/api/2026-10/graphql.json',
    expect.objectContaining({ variables: { after: 'previous', query: 'Lumé' } }),
  );
  expect(result.cursor).toBe('next');
  expect(result.items[0].price).toBe('12.50');
});
test('WooCommerce converts integer minor units, strips HTML and never includes reviewer identity', async () => {
  jest
    .mocked(remoteJson)
    .mockResolvedValueOnce([
      {
        id: 1,
        name: '<b>Lumé</b>',
        description: '<p>Un flacon.</p>',
        permalink: 'https://shop.com/p',
        images: [],
        prices: { price: '1250', currency_code: 'EUR', currency_minor_unit: 2 },
      },
    ])
    .mockResolvedValueOnce([
      {
        id: 2,
        review: '<p>Bon flacon.</p>',
        rating: 4,
        reviewer: 'Private Person',
        reviewer_email: 'private@example.com',
      },
    ]);
  const result = await catalog('woocommerce', 'https://shop.com');
  expect(result.items[0]).toMatchObject({
    name: 'Lumé',
    price: '12.50',
    description: 'Un flacon.',
  });
  const feedback = await reviews('https://shop.com', '1');
  expect(feedback).toEqual([{ id: '2', text: 'Bon flacon.', rating: 4, date: '' }]);
  expect(JSON.stringify(feedback)).not.toContain('private');
});
test('YouTube keeps the key in a header and labels the actual chart scope with provenance', async () => {
  const mock = jest
    .spyOn(globalThis, 'fetch')
    .mockResolvedValue(
      Response.json({
        items: [
          {
            id: 'Abc_1234567',
            snippet: {
              title: 'Published video',
              channelTitle: 'Channel',
              publishedAt: '2026-10-01T00:00:00Z',
            },
            statistics: { viewCount: '1234' },
          },
        ],
      }),
    );
  const result = await youtubeTrends('private-api-key', 'FR');
  expect(String(mock.mock.calls[0][0])).not.toContain('private-api-key');
  expect(mock.mock.calls[0][1]?.headers).toEqual({ 'X-Goog-Api-Key': 'private-api-key' });
  expect(result.scope).toContain('n’est pas un classement UGC/TikTok');
  expect(result.items[0].url).toBe('https://www.youtube.com/watch?v=Abc_1234567');
});
