import { assertFreeModel, generateScript, DEFAULT_FREE_MODEL } from '../../apps/web/lib/llm';
import { campaignSchema } from '@vidi/core';
import { guestLimit } from '../../apps/web/lib/guest-limit';
jest.mock('@vercel/oidc', () => ({
  getVercelOidcToken: jest.fn().mockResolvedValue('test-only-oidc-token'),
}));
const product = {
  name: 'Lumé',
  description: 'Un flacon rechargeable.',
  audience: '',
  benefits: [],
  url: '',
  image: 'data:image/png;base64,AAAA',
};
const env = { ...process.env };
afterEach(() => {
  process.env = { ...env };
  jest.restoreAllMocks();
});
test('free-only rejects missing, ambiguous and nonzero pricing', () => {
  for (const pricing of [
    { input: '0.00001', output: '0' },
    { input: '0', output: '0', varies_by_provider: true },
    { input: '0' },
  ])
    expect(() =>
      assertFreeModel({ data: [{ id: 'chosen', type: 'language', pricing }] }, 'chosen'),
    ).toThrow('gratuit');
  expect(() =>
    assertFreeModel(
      { data: [{ id: 'chosen', type: 'language', pricing: { input: '0', output: '0' } }] },
      'chosen',
    ),
  ).not.toThrow();
});
test('generation uses OIDC, verifies zero pricing, excludes images and returns validated content', async () => {
  process.env.LLM_PROVIDER = 'vercel';
  process.env.VERCEL = '1';
  delete process.env.AI_GATEWAY_API_KEY;
  const mock = jest
    .spyOn(globalThis, 'fetch')
    .mockResolvedValueOnce(
      Response.json({
        data: [{ id: DEFAULT_FREE_MODEL, type: 'language', pricing: { input: '0', output: '0' } }],
      }),
    )
    .mockResolvedValueOnce(
      Response.json({
        model: DEFAULT_FREE_MODEL,
        choices: [
          {
            message: {
              content: JSON.stringify({
                hook: 'Découvrez Lumé',
                body: 'Un flacon rechargeable.',
                cta: 'Voir les détails.',
              }),
            },
          },
        ],
      }),
    );
  const campaign = campaignSchema.parse({
    brief: { name: 'Test brand', avoided: 'miracle' },
    evidence: [
      {
        id: 'proof',
        claim: 'rechargeable',
        source: 'https://private-proof.example.com/p',
        note: 'Internal reviewer note',
      },
    ],
  });
  const result = await generateScript({
    product,
    language: 'fr',
    duration: 15,
    creativeContext: { brief: campaign.brief, evidence: campaign.evidence },
  });
  expect(result.script.hook).toBe('Découvrez Lumé');
  expect(mock).toHaveBeenCalledTimes(2);
  const body = JSON.parse(String(mock.mock.calls[1][1]?.body));
  expect(JSON.stringify(body)).not.toContain('base64');
  expect(body.model).toBe(DEFAULT_FREE_MODEL);
  expect(body.models).toBeUndefined();
  const context = JSON.parse(body.messages[1].content).creativeContext;
  expect(context.brief.avoided).toBe('miracle');
  expect(context.evidence).toEqual([{ claim: 'rechargeable' }]);
  expect(JSON.stringify(body)).not.toContain('private-proof');
  expect(JSON.stringify(body)).not.toContain('Internal reviewer');
});
test('catalog pricing change stops before inference', async () => {
  process.env.LLM_PROVIDER = 'vercel';
  process.env.VERCEL = '1';
  const mock = jest.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
    Response.json({
      data: [{ id: DEFAULT_FREE_MODEL, type: 'language', pricing: { input: '0.01', output: '0' } }],
    }),
  );
  await expect(generateScript({ product, language: 'fr', duration: 15 })).rejects.toMatchObject({
    status: 503,
  });
  expect(mock).toHaveBeenCalledTimes(1);
});
test('private-prototype guest limit rejects the eleventh request in a minute', () => {
  const now = Date.UTC(2040, 1, 1);
  for (let n = 0; n < 10; n++) guestLimit(now);
  expect(() => guestLimit(now)).toThrow('limite');
  expect(() => guestLimit(now + 60000)).not.toThrow();
});
