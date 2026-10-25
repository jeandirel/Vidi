/** Opt-in authenticated build check. Only disposable smoke-test accounts are created and removed. */
import { createRequire } from 'node:module';
import { randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { PrismaClient } from '@prisma/client';
if (process.env.VIDI_CLOUD_SMOKE !== 'true') process.exit(0);
const db = new PrismaClient();
const require = createRequire(import.meta.url);
const origin = 'http://127.0.0.1:3941';
const server = spawn(
  process.execPath,
  [require.resolve('next/dist/bin/next'), 'start', '--port', '3941', '--hostname', '127.0.0.1'],
  { stdio: 'ignore', env: { ...process.env, REDIS_URL: '' } },
);
server.on('error', () => {});
let cookie = '';
const email = `vidi-smoke-${randomUUID()}@example.test`;
const password = randomUUID() + randomUUID();
let userId, workspaceId, pendingAssetId;
async function call(path, data, status = 200, method) {
  const response = await fetch(origin + path, {
    method: method || (data === undefined ? 'GET' : 'POST'),
    headers: { Origin: origin, Cookie: cookie, 'Content-Type': 'application/json' },
    ...(data !== undefined ? { body: JSON.stringify(data) } : {}),
    signal: AbortSignal.timeout(20000),
  });
  if (response.status !== status)
    throw new Error(
      `CLOUD_CHECK_${path.split('?')[0].replace(/[^a-z0-9]/gi, '_')}_${response.status}`,
    );
  const session = response.headers.get('set-cookie')?.match(/vidi_session=([^;]*)/);
  if (session) cookie = `vidi_session=${session[1]}`;
  return response.json();
}
try {
  let ready = false;
  for (let i = 0; i < 60; i++) {
    try {
      if ((await fetch(origin + '/api/capabilities', { signal: AbortSignal.timeout(1000) })).ok) {
        ready = true;
        break;
      }
    } catch {
      // The server may still be starting; retry within the bounded readiness window.
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  if (!ready) throw new Error('CLOUD_CHECK_SERVER_UNAVAILABLE');
  const registered = await call(
    '/api/auth/register',
    { name: 'Vidi Cloud Verification', email, password },
    201,
  );
  userId = registered.id;
  const session = await call('/api/auth/session');
  workspaceId = session.workspaces[0].id;
  if (session.user.id !== userId) throw new Error('CLOUD_CHECK_SESSION');
  const connections = await call(`/api/connections?workspaceId=${workspaceId}`);
  const voices = await call(`/api/voices?workspaceId=${workspaceId}`);
  if (connections.connections.length || voices.profiles.length)
    throw new Error('CLOUD_CHECK_SERVICE_ISOLATION');
  const data = {
    title: 'Vidi smoke bottle',
    product: {
      name: 'Bottle',
      description: 'A refillable glass bottle.',
      audience: '',
      benefits: [],
      image: '',
      url: '',
    },
    script: {
      hook: 'A refillable bottle.',
      body: 'A glass bottle for your water.',
      cta: 'See the product.',
    },
    avatarId: 'lea',
    voiceId: 'claire',
    language: 'fr',
    emotion: 'warm',
    duration: 15,
    resolution: '720p',
    captions: true,
    clips: [],
  };
  const project = await call('/api/projects', { workspaceId, data }, 201);
  const reopened = await call(`/api/projects/${project.id}`);
  if (reopened.data.title !== data.title) throw new Error('CLOUD_CHECK_PROJECT_REOPEN');
  const found = await call(`/api/projects?workspaceId=${workspaceId}&q=smoke`);
  if (!found.projects.some((p) => p.id === project.id)) throw new Error('CLOUD_CHECK_SEARCH');
  if (process.env.VIDI_STORAGE_SMOKE === 'true') {
    const bytes = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jFqkAAAAASUVORK5CYII=',
      'base64',
    );
    const upload = await call('/api/assets/presign', {
      workspaceId,
      name: 'Vidi verification.png',
      type: 'image/png',
      size: bytes.length,
    });
    pendingAssetId = upload.assetId;
    const browserOrigin = 'https://vidi-roan.vercel.app';
    const preflight = await fetch(upload.uploadUrl, {
      method: 'OPTIONS',
      headers: {
        Origin: browserOrigin,
        'Access-Control-Request-Method': 'PUT',
        'Access-Control-Request-Headers': 'content-type',
      },
      signal: AbortSignal.timeout(15000),
    });
    if (
      !preflight.ok ||
      !['*', browserOrigin].includes(preflight.headers.get('access-control-allow-origin'))
    )
      throw new Error('STORAGE_CHECK_CORS');
    const put = await fetch(upload.uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': 'image/png' },
      body: bytes,
      signal: AbortSignal.timeout(20000),
    });
    if (!put.ok) throw new Error(`STORAGE_CHECK_UPLOAD_${put.status}`);
    await call(`/api/assets/${upload.assetId}`, {});
    const listed = await call(`/api/assets?workspaceId=${workspaceId}`);
    if (!listed.assets.some((a) => a.id === upload.assetId)) throw new Error('STORAGE_CHECK_LIST');
    const download = await call(`/api/assets/${upload.assetId}`);
    const unsigned = new URL(download.url);
    unsigned.search = '';
    const privateRead = await fetch(unsigned, { signal: AbortSignal.timeout(15000) });
    if (![401, 403, 404].includes(privateRead.status))
      throw new Error('STORAGE_CHECK_PRIVATE_ACCESS');
    const media = await fetch(download.url, { signal: AbortSignal.timeout(20000) });
    if (!media.ok || !Buffer.from(await media.arrayBuffer()).equals(bytes))
      throw new Error('STORAGE_CHECK_DOWNLOAD');
    await call(`/api/assets/${upload.assetId}`, {}, 200, 'DELETE');
    pendingAssetId = null;
    const after = await call(`/api/assets?workspaceId=${workspaceId}`);
    if (after.assets.some((a) => a.id === upload.assetId)) throw new Error('STORAGE_CHECK_DELETE');
    console.log(
      JSON.stringify({
        check: 'STORAGE_LIVE_VERIFIED',
        upload: true,
        confirmation: true,
        listing: true,
        signedDownload: true,
        privateAccess: true,
        deletion: true,
        cors: true,
      }),
    );
  }
  await call('/api/auth/logout', {});
  await call('/api/auth/session', undefined, 401);
  await call('/api/auth/login', { email, password });
  const relogin = await call('/api/auth/session');
  if (relogin.user.id !== userId) throw new Error('CLOUD_CHECK_RELOGIN');
  console.log(
    JSON.stringify({
      check: 'CLOUD_LIVE_VERIFIED',
      registration: true,
      session: true,
      projectSavedAndReopened: true,
      search: true,
      logout: true,
      relogin: true,
      quotaBackend: 'postgres',
    }),
  );
} finally {
  try {
    if (pendingAssetId) await call(`/api/assets/${pendingAssetId}`, {}, 200, 'DELETE');
    // Only this randomly named test account and its workspace belong to the test.
    const own = await db.user.findUnique({
      where: { email },
      select: { id: true, memberships: { select: { workspaceId: true, role: true } } },
    });
    if (
      own &&
      own.id === userId &&
      own.memberships.length === 1 &&
      own.memberships[0].role === 'OWNER' &&
      own.memberships[0].workspaceId === workspaceId
    ) {
      await db.workspace.delete({ where: { id: workspaceId } });
      await db.user.delete({ where: { id: userId } });
    }
  } finally {
    await db.$disconnect();
    server.kill('SIGTERM');
  }
}
