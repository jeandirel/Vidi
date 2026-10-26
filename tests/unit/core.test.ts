import {
  canRender,
  composeDraft,
  productSchema,
  projectSchema,
  renderCost,
  scriptSeconds,
} from '@vidi/core';
const product = {
  name: 'Lumé',
  description: 'Un sérum hydratant rechargeable.',
  benefits: ['Texture légère'],
  url: '',
  audience: 'Peaux sèches',
  image: '',
};
const base = {
  title: 'Campagne Lumé',
  product,
  script: composeDraft(product),
  avatarId: 'lea',
  voiceId: 'claire',
  language: 'fr',
  emotion: 'warm',
  duration: 15,
  resolution: '720p',
  captions: true,
  clips: [],
} as const;
test.each([
  [6, '720p', 1],
  [15, '720p', 1],
  [30, '720p', 2],
  [45, '1080p', 6],
  [60, '1080p', 8],
  [90, '1080p', 12],
  [15, '4k', 4],
  [60, '4k', 16],
  [90, '4k', 24],
] as const)('pricing duration %i / %s costs %i credits', (duration, resolution, cost) =>
  expect(renderCost(duration, resolution)).toBe(cost),
);
test('accepts caption clip track and extended durations', () => {
  const parsed = projectSchema.safeParse({
    ...base,
    duration: 90,
    clips: [
      { id: 'c1', kind: 'avatar', label: 'Avatar', start: 0, duration: 90 },
      { id: 'c2', kind: 'caption', label: 'Sous-titres', start: 0, duration: 90 },
    ],
  });
  expect(parsed.success).toBe(true);
});
test('plan restrictions are enforced independently of client settings', () => {
  expect(canRender('starter', '1080p')).toBe(false);
  expect(canRender('pro', '4k')).toBe(false);
  expect(canRender('agency', '4k')).toBe(true);
});
test('a composition draft only uses supplied facts, without fake testimonials', () => {
  const result = composeDraft(product);
  expect(result.body).toBe('Un sérum hydratant rechargeable. Texture légère');
  expect(result.hook).toBe('Découvrez Lumé.');
  expect(JSON.stringify(result)).not.toMatch(/j’ai|miracle|garanti|avis/i);
});
test('hostile URL schemes and SVG data URIs are rejected', () => {
  expect(productSchema.safeParse({ ...product, url: 'javascript:alert(1)' }).success).toBe(false);
  expect(
    productSchema.safeParse({ ...product, image: 'data:image/svg+xml;base64,AAAA' }).success,
  ).toBe(false);
});
test('timeline segments cannot extend beyond the project duration', () => {
  expect(
    projectSchema.safeParse({
      ...base,
      clips: [{ id: 'a', kind: 'avatar', label: 'Avatar', start: 10, duration: 10 }],
    }).success,
  ).toBe(false);
  expect(
    projectSchema.safeParse({
      ...base,
      clips: [{ id: 'a', kind: 'avatar', label: 'Avatar', start: 5, duration: 10 }],
    }).success,
  ).toBe(true);
});
test('duration estimate warns on scripts too long for a fifteen second cut', () => {
  expect(
    scriptSeconds({ hook: 'Bonjour', body: Array(70).fill('mot').join(' '), cta: 'Découvrez' }),
  ).toBeGreaterThan(15);
});
test('empty projects cannot be saved as production-ready projects', () => {
  expect(
    projectSchema.safeParse({ ...base, script: { hook: '', body: '', cta: '' } }).success,
  ).toBe(false);
});
test.each(['tiktok-punchy', 'boxed-minimal', 'gradient-pop', 'classic-white'] as const)(
  'validates subtitleStyle preset %s',
  (style) => {
    const parsed = projectSchema.safeParse({ ...base, subtitleStyle: style });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.subtitleStyle).toBe(style);
    }
  },
);
test('rejects invalid subtitleStyle', () => {
  expect(
    projectSchema.safeParse({ ...base, subtitleStyle: 'invalid-style' as any }).success,
  ).toBe(false);
});

