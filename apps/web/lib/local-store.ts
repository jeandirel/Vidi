import type { ProjectInput } from '@vidi/core';

export type LocalProject = {
  id: string;
  workspaceId: string;
  title: string;
  data: ProjectInput;
  revision: number;
  reviewStatus: string;
  archivedAt: Date | null;
  createdAt: Date;
};

export type LocalRender = {
  id: string;
  workspaceId: string;
  projectId: string;
  status: 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  credits: number;
  outputUrl: string | null;
  outputAssetId: string | null;
  error: string | null;
  createdAt: Date;
};

// Global in-memory stores for local/offline dev
const globalForStore = globalThis as unknown as {
  _localProjects?: Map<string, LocalProject>;
  _localRenders?: Map<string, LocalRender>;
};

export const localProjects = (globalForStore._localProjects ??= new Map<string, LocalProject>());
export const localRenders = (globalForStore._localRenders ??= new Map<string, LocalRender>());

// Seed with the completed HeyGen render if empty
if (!localProjects.has('proj_vimergy_zinc')) {
  localProjects.set('proj_vimergy_zinc', {
    id: 'proj_vimergy_zinc',
    workspaceId: 'ws_local',
    title: 'VIMERGY Sulfate de Zinc Liquide',
    revision: 1,
    reviewStatus: 'APPROVED',
    archivedAt: null,
    createdAt: new Date(),
    data: {
      title: 'VIMERGY Sulfate de Zinc Liquide',
      duration: 15,
      resolution: '1080p',
      aspectRatio: '9:16',
      avatarId: 'lea',
      voiceId: 'claire',
      script:
        "Arrêtez les gélules de zinc ! Regardez ça. Le zinc liquide Vimergy est absorbé instantanément par votre corps. Quelques gouttes le matin dans un verre d'eau suffisent pour booster votre immunité et votre peau. Commandez sur Amazon dès maintenant !",
      media: {
        kind: 'avatar',
        narration: 'standard',
      },
    },
  });
}

if (!localRenders.has('render_vimergy_zinc')) {
  localRenders.set('render_vimergy_zinc', {
    id: 'render_vimergy_zinc',
    workspaceId: 'ws_local',
    projectId: 'proj_vimergy_zinc',
    status: 'COMPLETED',
    credits: 1,
    outputUrl:
      'https://files2.heygen.ai/aws_pacific/avatar_tmp/da3afd9579f14d50b9b3b86825b3024a/f54c618364a6426694584534d414a64c.mp4?download_id=394a581b-558b-4adc-af76-632aee3f75c2&Expires=1793663655&Signature=XKXPR6Nf2k4JJC8Jq5UTM00XB5APvqE0d61Vq0sO59JUivYTGhmqBboSEVqlbdU9Gx0UOO-b3m2ZA3VxaAcBeuh3yEJf-n83fgHLqil0-Z8VRdSPKl19x2xJ4audCVY4sylyO~JHbY56GRu7o4m5lJ98xGjXiZecjYi75IlL5NyUGuOgh1Rgl8DsFwKhQg3QSPoHtX9JNL7XEHKNOttBV19eMbfkGYUe8BAHvyKqbqmXYLBWgYDuQfN1U8ugWB-qDQGowkZbpcycrqI5O1q9ECjvCjI6ZfprEXLXOoGeq4xShnlIxgej0jq77ZH4ubzI0nxU0Ey6ebzYxxNZvryAAA__&Key-Pair-Id=K38HBHX5LX3X2H',
    outputAssetId: null,
    error: null,
    createdAt: new Date(),
  });
}
