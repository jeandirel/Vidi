import { z } from 'zod';
import { campaignSchema, scriptSchema } from './campaign';
export * from './campaign';

export const productSchema = z.object({
  name: z.string().trim().min(2).max(120),
  commerce: z
    .object({
      provider: z.enum(['shopify', 'woocommerce']),
      externalId: z.string().max(200),
      price: z
        .string()
        .regex(/^\d+(?:\.\d+)?$/)
        .max(40),
      currency: z.string().max(8),
      checkedAt: z.string().datetime(),
    })
    .optional(),
  description: z.string().trim().min(10).max(4000),
  url: z
    .union([
      z
        .string()
        .max(2000)
        .url()
        .refine((v) => /^https?:\/\//.test(v)),
      z.literal(''),
    ])
    .default(''),
  audience: z.string().trim().max(300).default(''),
  benefits: z
    .array(z.string().trim().max(300))
    .max(8)
    .default([])
    .transform((values) => values.filter(Boolean)),
  image: z
    .string()
    .max(1500000)
    .refine(
      (v) =>
        v === '' ||
        /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(v) ||
        /^https:\/\//.test(v),
    )
    .default(''),
});
export const clipSchema = z.object({
  id: z.string().max(100),
  label: z.string().max(80),
  kind: z.enum(['avatar', 'product', 'caption', 'audio']),
  start: z.number().min(0).max(120),
  duration: z.number().min(0.1).max(120),
});
export const projectSchema = z
  .object({
    title: z.string().trim().min(2).max(120),
    product: productSchema,
    script: scriptSchema,
    avatarId: z.enum(['lea', 'marcus', 'maya', 'alex', 'ines', 'kenji']),
    voiceId: z.enum(['claire', 'noah', 'amina', 'james']),
    language: z.enum(['fr', 'en', 'es', 'de', 'pt']),
    emotion: z.enum(['warm', 'energetic', 'calm']),
    duration: z.union([
      z.literal(6),
      z.literal(15),
      z.literal(30),
      z.literal(45),
      z.literal(60),
      z.literal(90),
    ]),
    resolution: z.enum(['720p', '1080p', '4k']),
    aspectRatio: z.enum(['9:16', '1:1', '16:9']).default('9:16'),
    captions: z.boolean(),
    subtitleStyle: z
      .enum(['tiktok-punchy', 'boxed-minimal', 'gradient-pop', 'classic-white'])
      .default('tiktok-punchy'),
    clips: z.array(clipSchema).max(30),
    campaign: campaignSchema.optional(),
    media: z
      .object({
        kind: z.enum(['product', 'avatar']),
        narration: z.enum(['none', 'standard', 'clone']),
        voiceProfileId: z.string().max(100).optional(),
      })
      .superRefine((m, ctx) => {
        if (m.narration === 'clone' && !m.voiceProfileId)
          ctx.addIssue({ code: 'custom', message: 'Choisissez une voix autorisée.' });
        if (m.kind === 'avatar' && m.narration === 'none')
          ctx.addIssue({ code: 'custom', message: 'Un avatar parlant nécessite une narration.' });
      })
      .optional(),
  })
  .superRefine((p, ctx) => {
    for (const c of p.clips)
      if (c.start + c.duration > p.duration)
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Un segment dépasse la durée du projet.',
          path: ['clips'],
        });
  });
export type Product = z.infer<typeof productSchema>;
export type Script = z.infer<typeof scriptSchema>;
export type ProjectInput = z.infer<typeof projectSchema>;
export type Clip = z.infer<typeof clipSchema>;

export const plans = {
  starter: { name: 'Starter', price: 99, credits: 15, maxResolution: '720p', workspaces: 1 },
  pro: { name: 'Pro', price: 299, credits: 60, maxResolution: '1080p', workspaces: 3 },
  agency: { name: 'Agency', price: 999, credits: 250, maxResolution: '4k', workspaces: 20 },
} as const;
export function renderCost(duration: number, resolution: ProjectInput['resolution']) {
  return Math.ceil(duration / 15) * { '720p': 1, '1080p': 2, '4k': 4 }[resolution];
}
export function canRender(plan: keyof typeof plans, resolution: ProjectInput['resolution']) {
  return (
    ['720p', '1080p', '4k'].indexOf(resolution) <=
    ['720p', '1080p', '4k'].indexOf(plans[plan].maxResolution)
  );
}
/** Local composition aid. Never presented as model output or a customer testimonial. */
export function composeDraft(product: Product, language: ProjectInput['language'] = 'fr'): Script {
  const benefit = product.benefits.filter(Boolean).join('. ');
  if (language === 'fr')
    return {
      hook: `Découvrez ${product.name}.`,
      body: [product.description, benefit].filter(Boolean).join(' '),
      cta: 'Découvrez les détails sur notre boutique.',
    };
  if (language === 'en')
    return {
      hook: `Meet ${product.name}.`,
      body: [product.description, benefit].filter(Boolean).join(' '),
      cta: 'Explore the details in our store.',
    };
  return {
    hook: product.name,
    body: [product.description, benefit].filter(Boolean).join(' '),
    cta: {
      es: 'Descubre más en nuestra tienda.',
      de: 'Mehr erfahren in unserem Shop.',
      pt: 'Saiba mais na nossa loja.',
    }[language],
  };
}
export function scriptWords(script: Script) {
  return Object.values(script).join(' ').trim().split(/\s+/).filter(Boolean).length;
}
export function scriptSeconds(script: Script) {
  return Math.ceil(scriptWords(script) / 2.4);
}
export function signableWebhook(eventId: string, body: string) {
  return `${eventId}.${body}`;
}

export * from './heygen';
