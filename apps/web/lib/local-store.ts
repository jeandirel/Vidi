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
