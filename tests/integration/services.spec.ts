import { test, expect } from '@playwright/test';
import { PrismaClient } from '@prisma/client';
const db = new PrismaClient();
test.afterAll(() => db.$disconnect());
test('service metadata, voice consent and revocation are isolated in real PostgreSQL', async ({
  playwright,
}) => {
  const baseURL = 'http://127.0.0.1:3000';
  const a = await playwright.request.newContext({ baseURL, extraHTTPHeaders: { Origin: baseURL } });
  const b = await playwright.request.newContext({ baseURL, extraHTTPHeaders: { Origin: baseURL } });
  const suffix = crypto.randomUUID();
  const emails = [`services-a-${suffix}@example.test`, `services-b-${suffix}@example.test`];
  const spaces: string[] = [];
  try {
    for (const [i, client] of [a, b].entries()) {
      expect(
        (
          await client.post('/api/auth/register', {
            data: { name: 'Service test', email: emails[i], password: `Test-only-${suffix}` },
          })
        ).status(),
      ).toBe(201);
      const session = await (await client.get('/api/auth/session')).json();
      spaces.push(session.workspaces[0].id);
    }
    const [workspaceId, other] = spaces;
    await db.serviceConnection.create({
      data: {
        workspaceId,
        provider: 'youtube',
        config: { region: 'FR' },
        checkedAt: new Date(),
        sealedSecret: 'opaque-fixture-no-real-credential',
      },
    });
    const connections = await a.get(`/api/connections?workspaceId=${workspaceId}`);
    expect(connections.status()).toBe(200);
    expect(await connections.text()).not.toContain('sealedSecret');
    expect(await connections.text()).not.toContain('opaque-fixture');
    expect((await b.get(`/api/connections?workspaceId=${workspaceId}`)).status()).toBe(404);
    expect((await b.get(`/api/voices?workspaceId=${workspaceId}`)).status()).toBe(404);
    // Database-only confirmed-asset fixture: this test verifies authorization, not TTS or S3.
    const asset = await db.asset.create({
      data: {
        workspaceId,
        key: `${workspaceId}/voice-fixture`,
        name: 'Fixture.wav',
        mime: 'audio/wav',
        size: 100,
        confirmedAt: new Date(),
      },
    });
    const request = {
      workspaceId,
      name: 'Authorized voice',
      sourceAssetId: asset.id,
      consent: true,
    };
    expect((await a.post('/api/voices', { data: { ...request, consent: false } })).status()).toBe(
      400,
    );
    expect(
      (await b.post('/api/voices', { data: { ...request, workspaceId: other } })).status(),
    ).toBe(422);
    const created = await a.post('/api/voices', { data: request });
    expect(created.status()).toBe(201);
    const profile = await created.json();
    const stored = await db.voiceProfile.findUniqueOrThrow({ where: { id: profile.id } });
    expect(stored.consentVersion).toBe('voice-rights-v1');
    expect(stored.consentUserId).toBeTruthy();
    // Editing provider configuration is owner-only even when the member can edit projects.
    const userB = await db.user.findUniqueOrThrow({ where: { email: emails[1] } });
    await db.membership.create({ data: { workspaceId, userId: userB.id, role: 'EDITOR' } });
    expect(
      (
        await b.post('/api/connections', {
          data: { workspaceId, provider: 'woocommerce', url: 'https://shop.example.com' },
        })
      ).status(),
    ).toBe(403);
    expect(
      (await a.delete('/api/voices', { data: { workspaceId, profileId: profile.id } })).status(),
    ).toBe(200);
    const after = await (await a.get(`/api/voices?workspaceId=${workspaceId}`)).json();
    expect(after.profiles).toEqual([]);
    expect(
      (await db.voiceProfile.findUniqueOrThrow({ where: { id: profile.id } })).revokedAt,
    ).not.toBeNull();
    expect(
      (await a.delete('/api/connections', { data: { workspaceId, provider: 'youtube' } })).status(),
    ).toBe(200);
    expect(await db.serviceConnection.count({ where: { workspaceId } })).toBe(0);
  } finally {
    await db.workspace.deleteMany({ where: { id: { in: spaces } } });
    await db.user.deleteMany({ where: { email: { in: emails } } });
    await a.dispose();
    await b.dispose();
  }
});
