/** Opt-in live check from Vercel's authenticated build; contains only a public test product. */
import { getVercelOidcToken } from '@vercel/oidc';
if (process.env.VIDI_LLM_SMOKE_TEST !== 'true') {
  process.exit(0);
}
const model = process.env.AI_GATEWAY_MODEL;
if (!model) throw new Error('LLM_SMOKE_MISSING_MODEL');
const catalogue = await fetch('https://ai-gateway.vercel.sh/v1/models', {
  signal: AbortSignal.timeout(10000),
});
if (!catalogue.ok) throw new Error('LLM_SMOKE_CATALOGUE_UNAVAILABLE');
const entry = (await catalogue.json()).data.find((x) => x.id === model);
if (
  entry?.type !== 'language' ||
  entry.pricing?.input !== '0' ||
  entry.pricing?.output !== '0' ||
  entry.pricing?.varies_by_provider
)
  throw new Error('LLM_SMOKE_MODEL_NOT_FREE');
let token = process.env.AI_GATEWAY_API_KEY;
if (!token) {
  try {
    token = await getVercelOidcToken();
  } catch {
    throw new Error('LLM_SMOKE_NO_VERCEL_IDENTITY');
  }
}
const result = await fetch('https://ai-gateway.vercel.sh/v1/chat/completions', {
  method: 'POST',
  redirect: 'error',
  signal: AbortSignal.timeout(40000),
  headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({
    model,
    max_tokens: 600,
    reasoning: { effort: 'none' },
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: 'ugc_script',
        strict: true,
        schema: {
          type: 'object',
          properties: {
            hook: { type: 'string' },
            body: { type: 'string' },
            cta: { type: 'string' },
          },
          required: ['hook', 'body', 'cta'],
          additionalProperties: false,
        },
      },
    },
    messages: [
      {
        role: 'system',
        content:
          'Write JSON with hook, body, cta for a short French product ad. Only use the supplied facts. Never invent reviews or claims.',
      },
      {
        role: 'user',
        content:
          'Public test product: a refillable glass water bottle, 500 ml. Write a 15-second ad in French.',
      },
    ],
  }),
});
if (!result.ok) {
  const body = await result.json().catch(() => ({}));
  const code = String(body.error?.code || body.error?.type || 'unavailable')
    .replace(/[^a-zA-Z0-9_-]/g, '')
    .slice(0, 70);
  throw new Error(`LLM_SMOKE_FAILED_${result.status}_${code}`);
}
const data = await result.json();
let output;
try {
  output = JSON.parse(data.choices?.[0]?.message?.content || '');
} catch {
  throw new Error('LLM_SMOKE_INVALID_JSON');
}
if (!['hook', 'body', 'cta'].every((k) => typeof output[k] === 'string' && output[k].trim()))
  throw new Error('LLM_SMOKE_INVALID_SCRIPT');
console.log(
  JSON.stringify({
    check: 'LLM_LIVE_VERIFIED',
    model: data.model || model,
    freePricingConfirmed: true,
    outputFields: Object.keys(output),
    totalTokens: data.usage?.total_tokens,
  }),
);
