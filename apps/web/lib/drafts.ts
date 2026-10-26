import { projectSchema, type ProjectInput } from '@vidi/core';
import { z } from 'zod';
const KEY = 'vidi:drafts:v1';
const schema = z
  .array(z.object({ id: z.string(), updatedAt: z.string(), data: projectSchema }))
  .max(50);
export type Draft = z.infer<typeof schema>[number];
export function loadDrafts(): Draft[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? schema.parse(JSON.parse(raw)) : [];
  } catch {
    return [];
  }
}
export function saveDraft(id: string, data: ProjectInput) {
  const valid = projectSchema.parse(data);
  const all = loadDrafts();
  const draft = { id, updatedAt: new Date().toISOString(), data: valid };
  const next = [draft, ...all.filter((d) => d.id !== id)].slice(0, 50);
  localStorage.setItem(KEY, JSON.stringify(next));
  return next;
}
export function deleteDraft(id: string) {
  const next = loadDrafts().filter((d) => d.id !== id);
  localStorage.setItem(KEY, JSON.stringify(next));
  return next;
}
export const emptyProject: ProjectInput = {
  title: 'Nouvelle création',
  product: { name: '', description: '', url: '', audience: '', benefits: [], image: '' },
  script: { hook: '', body: '', cta: '' },
  avatarId: 'lea',
  voiceId: 'claire',
  language: 'fr',
  emotion: 'warm',
  duration: 15,
  resolution: '720p',
  aspectRatio: '9:16',
  captions: true,
  subtitleStyle: 'tiktok-punchy',
  clips: [
    { id: 'avatar-1', label: 'Présentation', kind: 'avatar', start: 0, duration: 15 },
    { id: 'caption-1', label: 'Sous-titres', kind: 'caption', start: 0, duration: 15 },
  ],
};
