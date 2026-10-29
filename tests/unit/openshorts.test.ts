import { buildOpenShortsScript } from '../../packages/core/src/openshorts';
import type { ProjectInput } from '../../packages/core/src';

const project: ProjectInput = {
  title: 'Publicité test',
  product: { name: 'Produit Test', description: 'Objet utile pour organiser le bureau à la maison.',
    url: '', audience: 'Personnes en télétravail', benefits: ['Gain de place'], image: '' },
  script: { hook: 'Un bureau encombré ?', body: 'Découvrez une solution simple pour votre espace.',
    cta: 'Découvrez ce produit.' },
  avatarId: 'lea', voiceId: 'claire', language: 'fr', emotion: 'warm',
  duration: 30, resolution: '720p', aspectRatio: '9:16', captions: true,
  subtitleStyle: 'tiktok-punchy', clips: [], media: { kind: 'avatar', narration: 'standard' },
};

describe('OpenShorts adapter', () => {
  it('uses exactly five shots and the approved Vidi narration', () => {
    const result = buildOpenShortsScript(project);
    expect(result.segments.map((s) => s.visual))
      .toEqual(['actor_talking', 'broll', 'actor_talking', 'broll', 'actor_talking']);
    expect(result.full_narration)
      .toBe('Un bureau encombré ? Découvrez une solution simple pour votre espace. Découvrez ce produit.');
    expect(result.segments.filter((s) => s.visual === 'broll')).toHaveLength(2);
    expect(result._product_name).toBe('Produit Test');
  });
  it('rejects unsupported lengths and ratios before paid calls', () => {
    expect(() => buildOpenShortsScript({ ...project, duration: 15 })).toThrow('OPENSHORTS_REQUIRES_30S_VERTICAL');
    expect(() => buildOpenShortsScript({ ...project, aspectRatio: '16:9' })).toThrow('OPENSHORTS_REQUIRES_30S_VERTICAL');
  });
  it('rejects overlong narration', () => {
    expect(() => buildOpenShortsScript({
      ...project, script: { ...project.script, body: 'hello '.repeat(80) },
    })).toThrow('OPENSHORTS_SCRIPT_TOO_LONG');
  });
});
