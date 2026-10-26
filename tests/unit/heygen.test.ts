import {
  buildHeyGenPayload,
  generateHeyGenVideo,
  HEYGEN_AVATARS,
} from '../../apps/worker/src/providers/heygen';
import { projectSchema } from '@vidi/core';

const sampleProject = projectSchema.parse({
  title: 'Campagne Test HeyGen',
  duration: 15,
  resolution: '1080p',
  aspectRatio: '9:16',
  subtitleStyle: 'tiktok-punchy',
  language: 'fr',
  emotion: 'warm',
  avatarId: 'lea',
  voiceId: 'claire',
  captions: true,
  product: {
    name: 'Sérum Lumé',
    description: 'Un sérum hydratant rechargeable.',
    url: '',
    audience: '',
    benefits: ['Hydratation 24h'],
    image: '',
  },
  script: {
    hook: 'Découvrez notre nouveauté.',
    body: 'Un sérum qui change votre routine beauté.',
    cta: 'Commandez maintenant sur le site.',
  },
  clips: [],
});

describe('HeyGen Provider Integration', () => {
  test('builds payload with correct 9:16 vertical dimensions and mapped avatar', () => {
    const payload = buildHeyGenPayload(sampleProject);
    expect(payload.aspect_ratio).toBe('9:16');
    expect(payload.dimension).toEqual({ width: 1080, height: 1920 });
    expect(payload.video_inputs[0].character.avatar_id).toBe(HEYGEN_AVATARS.lea);
    expect(payload.video_inputs[0].voice.input_text).toBe(
      'Découvrez notre nouveauté. Un sérum qui change votre routine beauté. Commandez maintenant sur le site.',
    );
    expect(payload.caption).toBe(true);
  });

  test.each([
    ['1:1', { width: 1080, height: 1080 }],
    ['16:9', { width: 1920, height: 1080 }],
  ] as const)('maps aspect ratio %s to dimensions %o', (ratio, expectedDim) => {
    const proj = { ...sampleProject, aspectRatio: ratio };
    const payload = buildHeyGenPayload(proj);
    expect(payload.aspect_ratio).toBe(ratio);
    expect(payload.dimension).toEqual(expectedDim);
  });

  test.each(['lea', 'marcus', 'maya', 'alex', 'ines', 'kenji'] as const)(
    'maps avatarId %s to a recognized HeyGen avatar string',
    (id) => {
      const proj = { ...sampleProject, avatarId: id };
      const payload = buildHeyGenPayload(proj);
      expect(payload.video_inputs[0].character.avatar_id).toBe(HEYGEN_AVATARS[id]);
      expect(typeof payload.video_inputs[0].character.avatar_id).toBe('string');
    },
  );

  test('rejects short or empty api keys', async () => {
    await expect(
      generateHeyGenVideo({ project: sampleProject, apiKey: '' }),
    ).rejects.toThrow('HEYGEN_API_KEY_INVALID');
    await expect(
      generateHeyGenVideo({ project: sampleProject, apiKey: 'short' }),
    ).rejects.toThrow('HEYGEN_API_KEY_INVALID');
  });

  test('successfully polls for completed video generation', async () => {
    const originalFetch = global.fetch;
    const mockFetch = jest
      .fn()
      // 1. Initial generate response
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ code: 100, data: { video_id: 'vid-test-123' } }),
      })
      // 2. Status poll response: processing
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ code: 100, data: { status: 'processing' } }),
      })
      // 3. Status poll response: completed
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          code: 100,
          data: {
            status: 'completed',
            video_url: 'https://resource2.heygen.ai/video/vid-test-123.mp4',
          },
        }),
      });

    global.fetch = mockFetch as unknown as typeof fetch;

    try {
      const result = await generateHeyGenVideo({
        project: sampleProject,
        apiKey: 'hg_test_api_key_valid_1234567890',
        pollIntervalMs: 1,
      });
      expect(result.videoUrl).toBe('https://resource2.heygen.ai/video/vid-test-123.mp4');
      expect(mockFetch).toHaveBeenCalledTimes(3);
    } finally {
      global.fetch = originalFetch;
    }
  });

  test('surfaces HeyGen failure errors properly', async () => {
    const originalFetch = global.fetch;
    const mockFetch = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ code: 100, data: { video_id: 'vid-fail-123' } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          code: 100,
          data: { status: 'failed', error: 'Content moderation rejected' },
        }),
      });

    global.fetch = mockFetch as unknown as typeof fetch;

    try {
      await expect(
        generateHeyGenVideo({
          project: sampleProject,
          apiKey: 'hg_test_api_key_valid_1234567890',
          pollIntervalMs: 1,
        }),
      ).rejects.toThrow('Content moderation rejected');
    } finally {
      global.fetch = originalFetch;
    }
  });
});
