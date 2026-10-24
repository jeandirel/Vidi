import { test, expect } from '@playwright/test';
import { PrismaClient } from '@prisma/client';
import { composeDraft } from '../../packages/core/src';
const db = new PrismaClient();
test.afterAll(() => db.$disconnect());
test('invitations, roles, revision approval and API-key isolation use real PostgreSQL/Redis', async ({
  playwright,
}) => {
  const base = 'http://127.0.0.1:3000';
  const clients = await Promise.all(
    [0, 1, 2].map(() =>
      playwright.request.newContext({ baseURL: base, extraHTTPHeaders: { Origin: base } }),
    ),
  );
  const [owner, editor, viewer] = clients;
  const suffix = crypto.randomUUID();
  const emails = [0, 1, 2].map((i) => `collab-${i}-${suffix}@example.test`);
  const owned: string[] = [];
  try {
    for (const [i, c] of clients.entries()) {
      expect(
        (
          await c.post('/api/auth/register', {
            data: { name: `Collaborator ${i}`, email: emails[i], password: `Test-only-${suffix}` },
          })
        ).status(),
      ).toBe(201);
      const session = await (await c.get('/api/auth/session')).json();
      owned.push(session.workspaces[0].id);
    }
    const workspaceId = owned[0];
    await db.workspace.update({ where: { id: workspaceId }, data: { plan: 'agency' } });
    for (const [c, i, role] of [
      [editor, 1, 'EDITOR'],
      [viewer, 2, 'VIEWER'],
    ] as const) {
      const invite = await owner.post(`/api/workspaces/${workspaceId}/invitations`, {
        data: { email: emails[i], role },
      });
      expect(invite.status()).toBe(201);
      const token = new URL((await invite.json()).url).searchParams.get('invite');
      const wrong = await owner.post('/api/invitations/accept', { data: { token } });
      expect(wrong.status()).toBe(404);
      expect((await c.post('/api/invitations/accept', { data: { token } })).status()).toBe(200);
      expect((await c.post('/api/invitations/accept', { data: { token } })).status()).toBe(404);
    }
    const product = {
      name: 'Lumé',
      description: 'Un flacon rechargeable.',
      url: '',
      image: '',
      benefits: [],
      audience: '',
    };
    let data = {
      title: 'Lumé',
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
    };
    const created = await owner.post('/api/projects', { data: { workspaceId, data } });
    expect(created.status()).toBe(201);
    let project = await created.json();
    expect((await viewer.put(`/api/projects/${project.id}`, { data })).status()).toBe(403);
    expect(
      (
        await editor.post(`/api/workspaces/${workspaceId}/keys`, {
          data: { name: 'Forbidden', role: 'EDITOR' },
        })
      ).status(),
    ).toBe(403);
    expect(
      (
        await editor.post(`/api/projects/${project.id}/review`, {
          data: { revision: project.revision, decision: 'IN_REVIEW' },
        })
      ).status(),
    ).toBe(200);
    expect(
      (
        await editor.post(`/api/projects/${project.id}/review`, {
          data: { revision: project.revision, decision: 'APPROVED' },
        })
      ).status(),
    ).toBe(403);
    expect(
      (
        await viewer.post(`/api/projects/${project.id}/review`, {
          data: { revision: project.revision, decision: 'APPROVED', message: 'Validé' },
        })
      ).status(),
    ).toBe(200);
    // Saving unchanged content keeps its approval; editing creates a new revision that requires approval again.
    const unchanged = await owner.put(`/api/projects/${project.id}`, { data });
    expect((await unchanged.json()).reviewStatus).toBe('APPROVED');
    data = { ...data, script: { ...data.script, hook: 'Un nouvel angle.' } };
    const edited = await editor.put(`/api/projects/${project.id}`, { data });
    project = await edited.json();
    expect(project.reviewStatus).toBe('DRAFT');
    expect(project.requiresApproval).toBe(true);
    expect(
      (
        await owner.post('/api/renders', {
          data: { workspaceId, projectId: project.id, idempotencyKey: crypto.randomUUID() },
        })
      ).status(),
    ).toBe(409);
    const result = await owner.post(`/api/workspaces/${workspaceId}/keys`, {
      data: { name: 'Read-only test', role: 'VIEWER', days: 1 },
    });
    expect(result.status()).toBe(201);
    const { key, token } = await result.json();
    const api = await playwright.request.newContext({
      baseURL: base,
      extraHTTPHeaders: { Authorization: `Bearer ${token}` },
    });
    try {
      expect((await api.get(`/api/projects?workspaceId=${workspaceId}`)).status()).toBe(200);
      expect((await api.get(`/api/projects?workspaceId=${owned[1]}`)).status()).toBe(404);
      expect((await api.post('/api/projects', { data: { workspaceId, data } })).status()).toBe(403);
      expect(
        (
          await owner.delete(`/api/workspaces/${workspaceId}/keys`, { data: { keyId: key.id } })
        ).status(),
      ).toBe(200);
      expect((await api.get(`/api/projects?workspaceId=${workspaceId}`)).status()).toBe(401);
    } finally {
      await api.dispose();
    }
    expect((await editor.delete(`/api/projects/${project.id}`)).status()).toBe(200);
    expect((await owner.get(`/api/projects/${project.id}`)).status()).toBe(404);
    expect((await owner.post('/api/billing/webhook', { data: {} })).status()).toBe(400);
  } finally {
    for (const workspaceId of owned) {
      await db.creditEntry.deleteMany({ where: { workspaceId } });
      await db.workspace.deleteMany({ where: { id: workspaceId } });
    }
    await db.user.deleteMany({ where: { email: { in: emails } } });
    await Promise.all(clients.map((c) => c.dispose()));
  }
});
