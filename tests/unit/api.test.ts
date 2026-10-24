import { ApiError, checkOrigin, errorResponse, jsonBody } from '../../apps/web/lib/api';
test('cookie mutations reject absent and cross-site origins', () => {
  expect(() =>
    checkOrigin(new Request('https://vidi.test/api/projects', { method: 'POST' })),
  ).toThrow(ApiError);
  expect(() =>
    checkOrigin(
      new Request('https://vidi.test/api/projects', {
        method: 'POST',
        headers: { origin: 'https://evil.test' },
      }),
    ),
  ).toThrow(ApiError);
  expect(() =>
    checkOrigin(
      new Request('https://vidi.test/api/projects', {
        method: 'POST',
        headers: { origin: 'https://vidi.test' },
      }),
    ),
  ).not.toThrow();
});
test('malformed and oversized bodies are rejected before processing', async () => {
  await expect(
    jsonBody(new Request('https://vidi.test', { method: 'POST', body: 'not json' })),
  ).rejects.toMatchObject({ status: 400 });
  await expect(
    jsonBody(
      new Request('https://vidi.test', {
        method: 'POST',
        headers: { 'content-length': '3000000' },
        body: '{}',
      }),
    ),
  ).rejects.toMatchObject({ status: 413 });
});
test('untrusted internal errors do not leak credentials to API clients', async () => {
  const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
  const response = errorResponse(new Error('postgres://user:secret@example.test/db'));
  expect(response.status).toBe(503);
  expect(JSON.stringify(await response.json())).not.toContain('secret');
  spy.mockRestore();
});

test('origin validation uses the incoming Host when Next normalizes its listening URL', () => {
  expect(() =>
    checkOrigin(
      new Request('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { host: '127.0.0.1:3000', origin: 'http://127.0.0.1:3000' },
      }),
    ),
  ).not.toThrow();
  expect(() =>
    checkOrigin(
      new Request('https://vidi.test/api/auth/register', {
        method: 'POST',
        headers: {
          host: 'vidi.test',
          origin: 'https://evil.test',
          'x-forwarded-host': 'evil.test',
        },
      }),
    ),
  ).toThrow(ApiError);
});
