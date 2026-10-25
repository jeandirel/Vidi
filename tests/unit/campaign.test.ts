import {
  campaignSchema,
  createVariants,
  evidenceSchema,
  metricsFor,
  readResultsCsv,
  reviewScript,
  toCsv,
  projectSchema,
} from '@vidi/core';
import { emptyProject } from '../../apps/web/lib/drafts';
const base = {
  script: { hook: 'Découvrez Lumé.', body: 'Le flacon est rechargeable.', cta: 'Voir le produit.' },
  avatarId: 'lea',
  voiceId: 'claire',
  language: 'fr',
  emotion: 'warm',
  duration: 15,
  resolution: '720p',
  productName: 'Lumé',
} as const;
const variants = createVariants(
  base,
  'hook',
  ['Le flacon est rechargeable.', 'Découvrez Lumé.'],
  'test',
  '2026-10-25T12:00:00.000Z',
);
const header = 'variant_id,impressions,clicks,spend,conversions,revenue\n';
test('test sets deduplicate and freeze every field except the variable under test', () => {
  expect(variants).toHaveLength(2);
  expect(variants[1].script.body).toBe(base.script.body);
  expect(variants[1].script.cta).toBe(base.script.cta);
  expect(variants[1].avatarId).toBe(base.avatarId);
  expect(() =>
    createVariants(base, 'hook', ['Découvrez Lumé.'], 'test', new Date().toISOString()),
  ).toThrow('alternatives');
  expect(campaignSchema.safeParse({ variants }).success).toBe(true);
  const tampered = structuredClone(variants);
  tampered[1].script.cta = 'Offre différente';
  expect(campaignSchema.safeParse({ variants: tampered }).success).toBe(false);
});
test('the old project format stays valid and campaign metadata survives server validation', () => {
  const project = {
    ...emptyProject,
    product: { ...emptyProject.product, name: 'Lumé', description: 'Le flacon est rechargeable.' },
    script: base.script,
  };
  expect(projectSchema.parse(project).campaign).toBeUndefined();
  const campaign = campaignSchema.parse({ brief: { name: 'Lumé' }, variants });
  expect(projectSchema.parse({ ...project, campaign }).campaign).toEqual(campaign);
});
test('CSV handles BOM, quoted fields, CRLF and semicolons without silent conversion', () => {
  const csv =
    '\uFEFF"variant_id";"impressions";"clicks";"spend";"conversions";"revenue"\r\n"test_1";"1000";"50";"12.5";"5";"50"\r\n';
  expect(
    readResultsCsv(
      csv,
      variants.map((v) => v.id),
    ),
  ).toEqual([
    {
      variantId: 'test_1',
      impressions: 1000,
      clicks: 50,
      spend: 12.5,
      conversions: 5,
      revenue: 50,
    },
  ]);
});
test.each([
  ['unknown,100,1,10,0,0'],
  ['test_1,100,1,10,0,0\ntest_1,100,1,10,0,0'],
  ['test_1,100,101,10,0,0'],
  ['test_1,100,1,-10,0,0'],
  ['test_1,100,1,1.001,0,0'],
  ['test_1,100,1,0.000001,0,0'],
  ['test_1,100,1,10,0,4.567'],
  ['test_1,100,1,NaN,0,0'],
  ['test_1,100,1,=1+1,0,0'],
  ['test_1,100,1,,0,0'],
  ['test_1,10.5,1,10,0,0'],
  ['"test_1,100,1,10,0,0'],
  ['test_1,100,1,10,0,0,extra'],
])('CSV rejects invalid or dangerous data atomically: %s', (row) => {
  expect(() => readResultsCsv(header + row, ['test_1'])).toThrow();
});
test('CSV bounds prevent oversized or empty imports', () => {
  expect(() => readResultsCsv('a'.repeat(100001), [])).toThrow('100 Ko');
  expect(() => readResultsCsv(header, [])).toThrow('au moins');
});
test('rates use totals correctly and never invent a result on zero denominators', () => {
  expect(
    metricsFor({
      variantId: 'test_1',
      impressions: 1000,
      clicks: 50,
      spend: 12.5,
      conversions: 5,
      revenue: 50,
    }),
  ).toEqual({ ctr: 5, cpc: 0.25, cpa: 2.5, roas: 4 });
  expect(
    metricsFor({
      variantId: 'test_1',
      impressions: 0,
      clicks: 0,
      spend: 0,
      conversions: 0,
      revenue: 0,
    }),
  ).toEqual({ ctr: null, cpc: null, cpa: null, roas: null });
});
test('persisted results require provenance, known IDs and one row per variant', () => {
  const result = {
    variantId: 'test_1',
    impressions: 100,
    clicks: 1,
    spend: 10,
    conversions: 0,
    revenue: 0,
  };
  const context = {
    source: 'Meta export',
    period: '1–7 octobre, clic 7 j',
    currency: 'EUR',
    importedAt: new Date().toISOString(),
  };
  expect(campaignSchema.safeParse({ variants, results: [result] }).success).toBe(false);
  expect(
    campaignSchema.safeParse({ variants, results: [result], resultContext: context }).success,
  ).toBe(true);
  expect(
    campaignSchema.safeParse({ variants, results: [result, result], resultContext: context })
      .success,
  ).toBe(false);
  expect(campaignSchema.safeParse({ results: [result], resultContext: context }).success).toBe(
    false,
  );
});
test('review surfaces actual terms, excessive duration and sourced claims without claiming semantic verification', () => {
  const brief = campaignSchema.parse({ brief: { required: 'Boutique', avoided: 'miracle' } }).brief;
  const evidence = [
    { id: 'proof', claim: 'flacon rechargeable', source: 'https://shop.example.com/p', note: '' },
  ];
  const review = reviewScript(
    { hook: 'J’ai testé ce miracle', body: 'Flacon rechargeable. '.repeat(50), cta: '10 €.' },
    15,
    brief,
    evidence,
  );
  expect(review.issues.map((i) => i.code)).toEqual(
    expect.arrayContaining(['length', 'required', 'avoided', 'promise', 'testimonial', 'number']),
  );
  expect(review.linkedEvidence).toEqual(['proof']);
  expect(evidenceSchema.safeParse({ ...evidence[0], source: 'javascript:alert(1)' }).success).toBe(
    false,
  );
  expect(
    evidenceSchema.safeParse({ ...evidence[0], source: 'https://user:secret@shop.example.com' })
      .success,
  ).toBe(false);
});
test('CSV export neutralizes spreadsheet formulas and preserves quoted multiline text', () => {
  expect(toCsv([['=1+1', ' @SUM(A1)', '-1', 'a"b\nc']])).toBe(
    '\uFEFF"\'=1+1","\' @SUM(A1)","\'-1","a""b\nc"',
  );
});
