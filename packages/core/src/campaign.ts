import { z } from 'zod';
export const scriptSchema = z.object({
  hook: z.string().trim().min(1).max(400),
  body: z.string().trim().min(1).max(2400),
  cta: z.string().trim().min(1).max(300),
});
export const brandBriefSchema = z.object({
  name: z.string().trim().max(120).default(''),
  audience: z.string().trim().max(300).default(''),
  objective: z.enum(['awareness', 'traffic', 'sales']).default('sales'),
  tone: z.string().trim().max(300).default(''),
  required: z.string().trim().max(600).default(''),
  avoided: z.string().trim().max(600).default(''),
});
export const evidenceSchema = z.object({
  id: z.string().min(1).max(100),
  claim: z.string().trim().min(1).max(300),
  source: z
    .string()
    .max(2000)
    .url()
    .refine((s) => {
      const url = new URL(s);
      return url.protocol === 'https:' && !url.username && !url.password;
    }),
  note: z.string().trim().max(600).default(''),
});
export const variantSchema = z.object({
  id: z.string().regex(/^[a-zA-Z0-9_-]{1,100}$/),
  name: z.string().trim().min(1).max(120),
  testId: z.string().min(1).max(100),
  variable: z.enum(['hook', 'cta']),
  script: scriptSchema,
  avatarId: z.enum(['lea', 'marcus', 'maya', 'alex', 'ines', 'kenji']),
  voiceId: z.enum(['claire', 'noah', 'amina', 'james']),
  language: z.enum(['fr', 'en', 'es', 'de', 'pt']),
  emotion: z.enum(['warm', 'energetic', 'calm']),
  duration: z.union([z.literal(15), z.literal(30), z.literal(60)]),
  resolution: z.enum(['720p', '1080p', '4k']),
  productName: z.string().min(2).max(120),
  createdAt: z.string().datetime(),
});
const count = z.number().int().min(0).max(1e12);
const money = z.number().finite().min(0).max(1e12).multipleOf(0.01);
export const metricsSchema = z
  .object({
    variantId: z.string().min(1).max(100),
    impressions: count,
    clicks: count,
    spend: money,
    conversions: count,
    revenue: money,
  })
  .refine((r) => r.clicks <= r.impressions, 'Les clics ne peuvent pas dépasser les impressions.');
export const campaignSchema = z
  .object({
    brief: brandBriefSchema.default({}),
    inspiration: z
      .array(
        z.object({
          title: z.string().max(1000),
          url: z.string().url().max(2000),
          provider: z.literal('youtube'),
          observedAt: z.string().datetime(),
          note: z.string().max(600).default(''),
        }),
      )
      .max(8)
      .optional(),
    evidence: z.array(evidenceSchema).max(8).default([]),
    variants: z.array(variantSchema).max(24).default([]),
    results: z.array(metricsSchema).max(24).default([]),
    resultContext: z
      .object({
        source: z.string().trim().min(1).max(120),
        period: z.string().trim().min(1).max(120),
        currency: z.enum(['EUR', 'USD', 'GBP', 'XAF', 'XOF']),
        importedAt: z.string().datetime(),
      })
      .optional(),
  })
  .superRefine((campaign, ctx) => {
    for (const key of ['evidence', 'variants'] as const) {
      const ids = campaign[key].map((item) => item.id);
      if (new Set(ids).size !== ids.length)
        ctx.addIssue({ code: 'custom', path: [key], message: 'Identifiants dupliqués.' });
    }
    const variants = new Set(campaign.variants.map((v) => v.id));
    const seen = new Set<string>();
    for (const result of campaign.results) {
      if (!variants.has(result.variantId) || seen.has(result.variantId))
        ctx.addIssue({
          code: 'custom',
          path: ['results'],
          message: 'Variante inconnue ou dupliquée.',
        });
      seen.add(result.variantId);
    }
    if (campaign.results.length && !campaign.resultContext)
      ctx.addIssue({
        code: 'custom',
        path: ['resultContext'],
        message: 'Source et période requises.',
      });
    const sets = new Map<string, z.infer<typeof variantSchema>>();
    for (const variant of campaign.variants) {
      const first = sets.get(variant.testId);
      if (!first) {
        sets.set(variant.testId, variant);
        continue;
      }
      const stable = [
        'avatarId',
        'voiceId',
        'language',
        'emotion',
        'duration',
        'resolution',
        'productName',
        'variable',
      ] as const;
      if (
        stable.some((key) => first[key] !== variant[key]) ||
        first.script.body !== variant.script.body ||
        (variant.variable === 'hook'
          ? first.script.cta !== variant.script.cta
          : first.script.hook !== variant.script.hook)
      )
        ctx.addIssue({
          code: 'custom',
          path: ['variants'],
          message: 'Un test doit isoler une seule variable.',
        });
    }
  });
export type Campaign = z.infer<typeof campaignSchema>;
export type BrandBrief = z.infer<typeof brandBriefSchema>;
export type Evidence = z.infer<typeof evidenceSchema>;
export type Variant = z.infer<typeof variantSchema>;
export type Metrics = z.infer<typeof metricsSchema>;
export function createVariants(
  base: Omit<Variant, 'id' | 'name' | 'testId' | 'variable' | 'createdAt'>,
  variable: Variant['variable'],
  alternatives: string[],
  testId: string,
  createdAt: string,
): Variant[] {
  const unique = [
    ...new Set([base.script[variable], ...alternatives].map((v) => v.trim()).filter(Boolean)),
  ];
  if (unique.length < 2 || unique.length > 4)
    throw new Error('Ajoutez entre une et trois alternatives différentes.');
  return unique.map((value, i) =>
    variantSchema.parse({
      ...base,
      script: { ...base.script, [variable]: value },
      testId,
      variable,
      createdAt,
      id: `${testId}_${i + 1}`,
      name: `${variable === 'hook' ? 'Accroche' : 'CTA'} ${i + 1}`,
    }),
  );
}
export function metricsFor(result: Metrics) {
  return {
    ctr: result.impressions ? (result.clicks / result.impressions) * 100 : null,
    cpc: result.clicks ? result.spend / result.clicks : null,
    cpa: result.conversions ? result.spend / result.conversions : null,
    roas: result.spend ? result.revenue / result.spend : null,
  };
}
export function reviewScript(
  script: z.infer<typeof scriptSchema>,
  seconds: number,
  brief: BrandBrief,
  evidence: Evidence[],
  language = 'fr',
) {
  const text = Object.values(script).join(' ');
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  const estimatedSeconds = Math.ceil(words / 2.4);
  const issues: { code: string; message: string }[] = [];
  if (estimatedSeconds > seconds)
    issues.push({
      code: 'length',
      message: `Lecture estimée à ${estimatedSeconds} s pour une vidéo de ${seconds} s.`,
    });
  const normalize = (s: string) =>
    s
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  const normalized = normalize(text);
  for (const term of brief.avoided
    .split('\n')
    .map((v) => v.trim())
    .filter(Boolean))
    if (normalized.includes(normalize(term)))
      issues.push({ code: 'avoided', message: `Expression à éviter : « ${term} ».` });
  for (const term of brief.required
    .split('\n')
    .map((v) => v.trim())
    .filter(Boolean))
    if (!normalized.includes(normalize(term)))
      issues.push({ code: 'required', message: `Mention absente : « ${term} ».` });
  if (/\b(guaranteed|miracle|clinically|garanti|cliniquement|guerit)\b/i.test(normalized))
    issues.push({
      code: 'promise',
      message: 'Promesse sensible à vérifier avec une preuve adaptée.',
    });
  if (
    /(j['’]ai (teste|essaye|utilise)|i (tried|used)|mon experience|my experience)/i.test(normalized)
  )
    issues.push({
      code: 'testimonial',
      message: 'Expérience personnelle à justifier ; un avatar ne constitue pas un avis client.',
    });
  if (/\d/.test(text))
    issues.push({
      code: 'number',
      message: 'Vérifiez les chiffres, prix et dates dans leurs sources.',
    });
  const linked = evidence.filter((e) => normalized.includes(normalize(e.claim)));
  if (!linked.length)
    issues.push({
      code: 'evidence',
      message: 'Aucun argument sourcé ne correspond textuellement au script.',
    });
  return {
    words,
    estimatedSeconds,
    issues,
    linkedEvidence: linked.map((e) => e.id),
    coverage: ['fr', 'en'].includes(language) ? 'fr-en' : 'limited',
  };
}
/** Bounded RFC4180 parser: rejects ambiguous or partial imports. */
export function readResultsCsv(text: string, allowedIds: string[]): Metrics[] {
  if (text.length > 100000) throw new Error('Le fichier dépasse 100 Ko.');
  const input = text.replace(/^\uFEFF/, '');
  const separator = input.split(/\r?\n/, 1)[0].includes(';') ? ';' : ',';
  const rows: string[][] = [];
  let row: string[] = [],
    field = '',
    quoted = false,
    closed = false;
  const pushField = () => {
    row.push(field);
    field = '';
    closed = false;
    if (row.length > 10) throw new Error('Trop de colonnes.');
  };
  const pushRow = () => {
    pushField();
    if (row.some((s) => s.trim())) rows.push(row);
    row = [];
    if (rows.length > 25) throw new Error('Maximum 24 variantes.');
  };
  for (let i = 0; i < input.length; i++) {
    const c = input[i];
    if (quoted) {
      if (c === '"' && input[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') {
        quoted = false;
        closed = true;
      } else field += c;
    } else if (c === '"' && !field && !closed) quoted = true;
    else if (c === separator) pushField();
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && input[i + 1] === '\n') i++;
      pushRow();
    } else {
      if (closed || c === '"') throw new Error('Guillemets CSV invalides.');
      field += c;
    }
  }
  if (quoted) throw new Error('Guillemets CSV non fermés.');
  if (field || row.length || closed) pushRow();
  const headers = ['variant_id', 'impressions', 'clicks', 'spend', 'conversions', 'revenue'];
  if (rows[0]?.map((s) => s.trim()).join(',') !== headers.join(','))
    throw new Error('Utilisez les colonnes du modèle CSV fourni.');
  if (rows.length < 2) throw new Error('Ajoutez au moins une ligne de résultats.');
  const seen = new Set<string>();
  return rows.slice(1).map((cells, i) => {
    const id = cells[0]?.trim();
    if (cells.length !== 6 || !allowedIds.includes(id) || seen.has(id))
      throw new Error(`Ligne ${i + 2} : variante inconnue, dupliquée ou colonnes incorrectes.`);
    seen.add(id);
    const values = cells.slice(1).map((s) => {
      if (!/^\d+(?:\.\d+)?$/.test(s.trim()))
        throw new Error(`Ligne ${i + 2} : nombres positifs requis, décimales avec un point.`);
      return Number(s);
    });
    const parsed = metricsSchema.safeParse({
      variantId: id,
      impressions: values[0],
      clicks: values[1],
      spend: values[2],
      conversions: values[3],
      revenue: values[4],
    });
    if (!parsed.success) throw new Error(`Ligne ${i + 2} : compteurs ou montants invalides.`);
    return parsed.data;
  });
}
export function toCsv(rows: (string | number | null)[][]) {
  return (
    '\uFEFF' +
    rows
      .map((row) =>
        row
          .map((value) => {
            const raw = value === null ? '' : String(value);
            const safe = /^[\s]*[=+@\-\t\r]/.test(raw) ? "'" + raw : raw;
            return '"' + safe.replace(/"/g, '""') + '"';
          })
          .join(','),
      )
      .join('\r\n')
  );
}
