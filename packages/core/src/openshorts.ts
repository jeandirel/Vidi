import type { ProjectInput } from './index';

/**
 * Adapt a validated Vidi campaign to the 5-shot OpenShorts AI Shorts contract.
 * Only the user's verified product copy is used; the external generator must
 * not be trusted to reproduce exact product packaging or personal testimonials.
 */
export function buildOpenShortsScript(project: ProjectInput) {
  if (project.duration !== 30 || project.aspectRatio !== '9:16')
    throw new Error('OPENSHORTS_REQUIRES_30S_VERTICAL');
  const { hook, body, cta } = project.script;
  const narration = [hook, body, cta].join(' ').trim();
  if (narration.split(/\s+/).length > 70)
    throw new Error('OPENSHORTS_SCRIPT_TOO_LONG');
  const product = project.product;
  const verified = product.benefits.filter(Boolean).slice(0, 4).join('; ');
  const disclaimer = 'No invented brand marks, packaging, prices, promises or customer testimonials. ';
  const actorDescriptions: Record<ProjectInput['avatarId'], string> = {
    lea: 'An adult female presenter in casual modern clothing, natural indoor lighting',
    marcus: 'An adult male presenter in casual modern clothing, natural indoor lighting',
    maya: 'An adult female presenter in everyday clothing, bright home setting',
    alex: 'An adult male presenter in everyday clothing, bright home setting',
    ines: 'An adult female presenter in smart casual clothing, clean studio background',
    kenji: 'An adult male presenter in smart casual clothing, clean studio background',
  };
  const segments = [
    { type: 'hook', start: 0, end: 5, narration: hook, visual: 'actor_talking',
      broll_prompt: null, emotion: project.emotion, subtitle_text: hook },
    { type: 'problem', start: 5, end: 9, narration: '', visual: 'broll',
      broll_prompt: disclaimer + 'Show a realistic, generic everyday problem relevant to: ' +
        product.description.slice(0, 500), emotion: 'neutral', subtitle_text: '' },
    { type: 'solution', start: 9, end: 20, narration: body, visual: 'actor_talking',
      broll_prompt: null, emotion: project.emotion, subtitle_text: body },
    { type: 'demo', start: 20, end: 24, narration: '', visual: 'broll',
      broll_prompt: disclaimer + 'Show a realistic lifestyle setting for ' + product.name +
        '. Use only these verified details: ' + product.description.slice(0, 500) +
        '. Verified benefits: ' + verified +
        '. Avoid showing an invented replica of the product.', emotion: 'neutral', subtitle_text: '' },
    { type: 'cta', start: 24, end: 30, narration: cta, visual: 'actor_talking',
      broll_prompt: null, emotion: project.emotion, subtitle_text: cta },
  ];
  return {
    title: project.title,
    style: 'ugc',
    language: project.language,
    duration_seconds: 30,
    target_platform: 'tiktok',
    hook_text: hook.slice(0, 100),
    full_narration: narration,
    actor_description: actorDescriptions[project.avatarId],
    _product_name: product.name,
    _product_url: product.url || '',
    segments,
  };
}
