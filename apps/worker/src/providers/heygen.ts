import type { ProjectInput } from '@vidi/core';

export const HEYGEN_AVATARS: Record<ProjectInput['avatarId'], string> = {
  lea: 'Daisy-inskirt-20220818',
  marcus: 'Tyler-incasualsuit-20220721',
  maya: 'Kristin_expressive_20240415',
  alex: 'Eric_expressive_20240415',
  ines: 'Monica_expressive_20240412',
  kenji: 'Shawn_expressive_20240415',
};

export const HEYGEN_DIMENSIONS: Record<
  NonNullable<ProjectInput['aspectRatio']>,
  { width: number; height: number }
> = {
  '9:16': { width: 1080, height: 1920 },
  '1:1': { width: 1080, height: 1080 },
  '16:9': { width: 1920, height: 1080 },
};

export type HeyGenGenerateOptions = {
  project: ProjectInput;
  apiKey: string;
  testMode?: boolean;
  pollIntervalMs?: number;
};

export function buildHeyGenPayload(project: ProjectInput, testMode = false) {
  const avatarId = HEYGEN_AVATARS[project.avatarId] || HEYGEN_AVATARS.lea;
  const ratio = project.aspectRatio || '9:16';
  const dimensions = HEYGEN_DIMENSIONS[ratio];

  const fullText = [
    project.script.hook,
    project.script.body,
    project.script.cta,
  ]
    .filter(Boolean)
    .join(' ');

  return {
    video_inputs: [
      {
        character: {
          type: 'avatar',
          avatar_id: avatarId,
          avatar_style: 'normal',
        },
        voice: {
          type: 'text',
          input_text: fullText,
          speed: 1.0,
        },
        background: {
          type: 'color',
          value: '#08080c',
        },
      },
    ],
    dimension: dimensions,
    aspect_ratio: ratio,
    test: testMode,
    caption: project.captions ?? true,
  };
}

export async function generateHeyGenVideo({
  project,
  apiKey,
  testMode = false,
  pollIntervalMs = 5000,
}: HeyGenGenerateOptions): Promise<{ videoUrl: string }> {
  if (!apiKey || apiKey.trim().length < 10) {
    throw new Error('HEYGEN_API_KEY_INVALID');
  }

  const payload = buildHeyGenPayload(project, testMode);

  // 1. Initiate video generation
  const res = await fetch('https://api.heygen.com/v2/video/generate', {
    method: 'POST',
    headers: {
      'X-Api-Key': apiKey.trim(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(30000),
  });

  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(`HeyGen generation request failed: ${res.status} ${errorBody}`);
  }

  const data = (await res.json()) as {
    code: number;
    data?: { video_id?: string };
    message?: string;
  };

  const videoId = data.data?.video_id;
  if (!videoId) {
    throw new Error(data.message || 'HeyGen failed to return video_id');
  }

  // 2. Poll for video completion (up to 10 minutes)
  const maxAttempts = Math.ceil(600000 / Math.max(1, pollIntervalMs));

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));

    const statusRes = await fetch(
      `https://api.heygen.com/v1/video_status.get?video_id=${encodeURIComponent(videoId)}`,
      {
        headers: {
          'X-Api-Key': apiKey.trim(),
        },
        signal: AbortSignal.timeout(15000),
      },
    );

    if (!statusRes.ok) continue;

    const statusData = (await statusRes.json()) as {
      code: number;
      data?: {
        status?: 'pending' | 'processing' | 'completed' | 'failed';
        video_url?: string;
        error?: string | null;
      };
    };

    const status = statusData.data?.status;

    if (status === 'completed' && statusData.data?.video_url) {
      return { videoUrl: statusData.data.video_url };
    }

    if (status === 'failed') {
      throw new Error(statusData.data?.error || 'HeyGen rendering failed');
    }
  }

  throw new Error('HeyGen rendering timeout exceeded (10 minutes)');
}
