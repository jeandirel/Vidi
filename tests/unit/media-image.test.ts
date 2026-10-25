import { imageUrl, publicImageAddress, productImage } from '../../apps/worker/src/image';
import { lookup } from 'node:dns/promises';
import { request } from 'node:https';
import { EventEmitter } from 'node:events';
jest.mock('node:dns/promises', () => ({ lookup: jest.fn() }));
jest.mock('node:https', () => ({ request: jest.fn() }));
const dns = lookup as unknown as jest.Mock;
const http = request as unknown as jest.Mock;
beforeEach(() => {
  dns.mockReset();
  http.mockReset();
  dns.mockResolvedValue([{ address: '8.8.8.8', family: 4 }]);
});
test('image imports reject local URLs, encoded IPs, credentials and alternative ports', () => {
  for (const value of [
    'http://shop.example.com/p.png', 'https://0x7f000001/p.png',
    'https://[::1]/p.png', 'https://user:secret@shop.example.com/p.png',
    'https://shop.example.com:8443/p.png',
  ]) expect(() => imageUrl(value)).toThrow();
  for (const address of ['127.0.0.1', '10.0.0.1', '169.254.169.254', '::ffff:127.0.0.1', 'fc00::1'])
    expect(publicImageAddress(address)).toBe(false);
});
test('mixed public/private DNS answers never open an image connection', async () => {
  dns.mockResolvedValue([{ address: '8.8.8.8', family: 4 }, { address: '10.0.0.2', family: 4 }]);
  await expect(productImage('https://shop.example.com/p.png')).rejects.toThrow('Private image');
  expect(http).not.toHaveBeenCalled();
});
function response(statusCode: number, headers: Record<string, string>, bytes = Buffer.from('image')) {
  http.mockImplementationOnce((_url, options, callback) => {
    options.lookup('shop.example.com', {}, (_e: null, address: string, family: number) => {
      expect([address, family]).toEqual(['8.8.8.8', 4]);
    });
    const req = Object.assign(new EventEmitter(), { end: () => {
      const res = Object.assign(new EventEmitter(), { statusCode, headers, destroy: jest.fn() });
      callback(res);
      if (!res.destroy.mock.calls.length) { res.emit('data', bytes); res.emit('end'); }
    } });
    return req;
  });
}
test('public image bytes are fetched through pinned DNS and passed as an inline asset', async () => {
  response(200, { 'content-type': 'image/png' });
  await expect(productImage('https://shop.example.com/p.png')).resolves.toBe('data:image/png;base64,aW1hZ2U=');
});
test('redirects revalidate DNS rather than following private destinations', async () => {
  dns.mockResolvedValueOnce([{ address: '8.8.8.8', family: 4 }])
    .mockResolvedValueOnce([{ address: '192.168.1.2', family: 4 }]);
  response(302, { location: 'https://private.example.com/p.png' });
  await expect(productImage('https://shop.example.com/p.png')).rejects.toThrow('Private image');
  expect(http).toHaveBeenCalledTimes(1);
});
test('oversized responses and HTML disguised as an image are rejected', async () => {
  response(200, { 'content-type': 'image/png' }, Buffer.alloc(1024 * 1024 + 1));
  await expect(productImage('https://shop.example.com/p.png')).rejects.toThrow('exceeds');
  response(200, { 'content-type': 'text/html' });
  await expect(productImage('https://shop.example.com/p.png')).rejects.toThrow('Unsupported image');
});
