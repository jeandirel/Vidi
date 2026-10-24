import { extractProduct } from '../../apps/web/lib/product-metadata';
import { productUrl, publicAddress, fetchProductPage } from '../../apps/web/lib/product-fetch';
import { lookup } from 'node:dns/promises';
import { request } from 'node:https';
import { EventEmitter } from 'node:events';
jest.mock('node:dns/promises', () => ({ lookup: jest.fn() }));
jest.mock('node:https', () => ({ request: jest.fn() }));
const dns = lookup as unknown as jest.Mock;
const http = request as unknown as jest.Mock;
const pageUrl = 'https://shop.example.com/products/serum';

test.each([
  'http://shop.example.com/p',
  'https://127.0.0.1/p',
  'https://0x7f000001/p',
  'https://[::1]/p',
  'https://169.254.169.254/',
  'https://shop.internal/p',
  'https://user:secret@shop.example.com/',
  'https://shop.example.com:8443/p',
])('rejects unsafe URL %s', (value) => expect(() => productUrl(value)).toThrow());
test.each([
  '127.0.0.1',
  '10.0.0.1',
  '172.16.0.1',
  '192.168.0.1',
  '169.254.169.254',
  '::1',
  '::ffff:127.0.0.1',
  'fc00::1',
  'fe80::1',
  '224.0.0.1',
  '0.0.0.0',
])('rejects internal/special address %s', (address) => expect(publicAddress(address)).toBe(false));
test('permits global unicast addresses', () => {
  expect(publicAddress('8.8.8.8')).toBe(true);
  expect(publicAddress('2606:4700:4700::1111')).toBe(true);
});
test('extracts a JSON-LD product and strips markup without inventing benefits', () => {
  const result = extractProduct(
    `<script type="application/ld+json">${JSON.stringify({ '@graph': [{ '@type': 'Product', name: 'Sérum Lumé', description: '<p>Un <b>flacon</b> rechargeable.</p>', image: '/image.jpg', url: pageUrl }] })}</script>`,
    pageUrl,
  );
  expect(result).toMatchObject({
    name: 'Sérum Lumé',
    description: 'Un flacon rechargeable.',
    image: 'https://shop.example.com/image.jpg',
    source: 'structured-data',
  });
  expect(result).not.toHaveProperty('benefits');
});
test('metadata fallback decodes entities and rejects private image literals', () => {
  const result = extractProduct(
    '<meta property="og:title" content="Lumé &amp; vous"><meta name="description" content="Une fiche descriptive."><meta property="og:image" content="https://127.0.0.1/private">',
    pageUrl,
  );
  expect(result.name).toBe('Lumé & vous');
  expect(result.image).toBe('');
  expect(result.source).toBe('metadata');
});
test('multiple unrelated products require a direct product page', () =>
  expect(() =>
    extractProduct(
      `<script type="application/ld+json">${JSON.stringify([
        { '@type': 'Product', name: 'A' },
        { '@type': 'Product', name: 'B' },
      ])}</script>`,
      pageUrl,
    ),
  ).toThrow('plusieurs produits'));
test('an unambiguous URL selects the matching product', () => {
  const result = extractProduct(
    `<script type="application/ld+json">${JSON.stringify([
      { '@type': 'Product', name: 'Recommendation', url: '/other' },
      { '@type': 'Product', name: 'Selected product', url: pageUrl },
    ])}</script>`,
    pageUrl,
  );
  expect(result.name).toBe('Selected product');
});
test('malformed structured data falls back to page metadata', () =>
  expect(
    extractProduct(
      '<title>Produit de test</title><script type="application/ld+json">not json</script>',
      pageUrl,
    ).name,
  ).toBe('Produit de test'));

type FakeResponse = EventEmitter & {
  statusCode: number;
  headers: Record<string, string>;
  destroy: jest.Mock;
};
type PinnedOptions = {
  lookup: (
    host: string,
    options: object,
    callback: (error: null, address: string, family: number) => void,
  ) => void;
  family: number;
};
function respond(status: number, headers: Record<string, string>, html = '') {
  http.mockImplementationOnce(
    (_url: URL, options: PinnedOptions, callback: (res: FakeResponse) => void) => {
      const req = new EventEmitter() as EventEmitter & { end: () => void };
      options.lookup('shop.example.com', {}, (_err, address, family) => {
        expect(address).toBe('8.8.8.8');
        expect(family).toBe(4);
      });
      expect(options.family).toBe(4);
      req.end = () => {
        const res = Object.assign(new EventEmitter(), {
          statusCode: status,
          headers,
          destroy: jest.fn(),
        });
        callback(res);
        if (status === 200 && !res.destroy.mock.calls.length) {
          res.emit('data', Buffer.from(html));
          res.emit('end');
        }
      };
      return req;
    },
  );
}
beforeEach(() => {
  dns.mockReset();
  http.mockReset();
  dns.mockResolvedValue([{ address: '8.8.8.8', family: 4 }]);
});
test('pins the validated DNS address to the HTTP connection', async () => {
  respond(200, { 'content-type': 'text/html' }, '<title>Product</title>');
  await expect(fetchProductPage(pageUrl)).resolves.toEqual({
    html: '<title>Product</title>',
    url: pageUrl,
  });
  expect(dns).toHaveBeenCalledTimes(1);
});
test('redirects to private DNS are rejected before a second connection', async () => {
  dns
    .mockResolvedValueOnce([{ address: '8.8.8.8', family: 4 }])
    .mockResolvedValueOnce([{ address: '10.0.0.2', family: 4 }]);
  respond(302, { location: 'https://private.example.com/p' });
  await expect(fetchProductPage(pageUrl)).rejects.toMatchObject({ status: 400 });
  expect(http).toHaveBeenCalledTimes(1);
});
test('mixed public/private DNS answers are rejected', async () => {
  dns.mockResolvedValue([
    { address: '8.8.8.8', family: 4 },
    { address: '127.0.0.1', family: 4 },
  ]);
  await expect(fetchProductPage(pageUrl)).rejects.toMatchObject({ status: 400 });
  expect(http).not.toHaveBeenCalled();
});
test('oversized pages are rejected using the actual received byte count', async () => {
  respond(200, { 'content-type': 'text/html' }, 'x'.repeat(1024 * 1024 + 1));
  await expect(fetchProductPage(pageUrl)).rejects.toMatchObject({ status: 413 });
});
