import { test, expect } from '@playwright/test';
import { PrismaClient } from '@prisma/client';
import { campaignSchema, composeDraft } from '../../packages/core/src';
const db = new PrismaClient();
test.afterAll(() => db.$disconnect());
test('real PostgreSQL/Redis: cookie auth, tenant isolation, credit atomicity and idempotency', async ({
  playwright,
}) => {
  const a = await playwright.request.newContext({
    baseURL: 'http://127.0.0.1:3000',
    extraHTTPHeaders: { Origin: 'http://127.0.0.1:3000' },
  });
  const b = await playwright.request.newContext({
    baseURL: 'http://127.0.0.1:3000',
    extraHTTPHeaders: { Origin: 'http://127.0.0.1:3000' },
  });
  const suffix = crypto.randomUUID();
  const emails = [`a-${suffix}@example.test`, `b-${suffix}@example.test`];
  try {
    for (const [i, client] of [a, b].entries()) {
      const response = await client.post('/api/auth/register', {
        data: { name: `Tester ${i}`, email: emails[i], password: `Test-only-${suffix}` },
      });
      expect(response.status()).toBe(201);
      expect(response.headers()['set-cookie']).toContain('HttpOnly');
    }
    const session = await (await a.get('/api/auth/session')).json();
    const workspaceId = session.workspaces[0].id as string;
    const product = {
      name: 'Lumé',
      description: 'Un flacon rechargeable.',
      url: '',
      audience: '',
      benefits: [],
      image: '',
    };
    const data = {
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
      campaign: campaignSchema.parse({
        brief: { name: 'Cloud proof' },
        evidence: [{ id: 'source', claim: 'rechargeable', source: 'https://shop.example.com/p' }],
      }),
    };
    const created = await a.post('/api/projects', { data: { workspaceId, data } });
    expect(created.status()).toBe(201);
    const project = await created.json();
    const reopened = await (await a.get(`/api/projects/${project.id}`)).json();
    expect(reopened.data.campaign).toEqual(data.campaign);
    expect((await b.get(`/api/projects/${project.id}`)).status()).toBe(404);
    expect(
      (
        await b.post('/api/products/import', {
          data: { workspaceId, url: 'https://shop.example.com/p' },
        })
      ).status(),
    ).toBe(404);
    expect(
      (
        await a.post('/api/products/import', {
          data: { workspaceId, url: 'https://127.0.0.1/private' },
        })
      ).status(),
    ).toBe(400);

    expect((await b.get(`/api/projects?workspaceId=${workspaceId}`)).status()).toBe(404);
    expect((await b.put(`/api/projects/${project.id}`, { data })).status()).toBe(404);
    const key = crypto.randomUUID();
    expect(
      (
        await a.post('/api/renders', {
          data: { workspaceId, projectId: project.id, idempotencyKey: key },
        })
      ).status(),
    ).toBe(402);
    await db.workspace.update({ where: { id: workspaceId }, data: { credits: 2 } });
    const repeated = await Promise.all([
      a.post('/api/renders', { data: { workspaceId, projectId: project.id, idempotencyKey: key } }),
      a.post('/api/renders', { data: { workspaceId, projectId: project.id, idempotencyKey: key } }),
    ]);
    expect(repeated.map((r) => r.status()).sort()).toEqual(expect.arrayContaining([202]));
    expect(repeated.every((r) => [200, 202, 409].includes(r.status()))).toBe(true);
    expect((await db.workspace.findUniqueOrThrow({ where: { id: workspaceId } })).credits).toBe(1);
    const parallel = await Promise.all([
      a.post('/api/renders', {
        data: { workspaceId, projectId: project.id, idempotencyKey: crypto.randomUUID() },
      }),
      a.post('/api/renders', {
        data: { workspaceId, projectId: project.id, idempotencyKey: crypto.randomUUID() },
      }),
    ]);
    expect(parallel.map((r) => r.status()).sort()).toEqual([202, 402]);
    expect((await db.workspace.findUniqueOrThrow({ where: { id: workspaceId } })).credits).toBe(0);
    expect(await db.creditEntry.count({ where: { workspaceId, reason: 'RESERVE' } })).toBe(2);
  } finally {
    for (const email of emails) {
      const user = await db.user.findUnique({ where: { email }, include: { memberships: true } });
      if (user) {
        for (const m of user.memberships) {
          await db.creditEntry.deleteMany({ where: { workspaceId: m.workspaceId } });
          await db.workspace.delete({ where: { id: m.workspaceId } });
        }
        await db.user.delete({ where: { id: user.id } });
      }
    }
    await a.dispose();
    await b.dispose();
  }
});
