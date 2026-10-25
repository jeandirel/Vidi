import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
if (process.env.VIDI_DB_SETUP !== 'true') process.exit(0);
const direct = process.env.DATABASE_URL_UNPOOLED;
if (!direct || new URL(direct).hostname.includes('-pooler.'))
  throw new Error('Direct database connection required for migrations');
const require = createRequire(import.meta.url);
const result = spawnSync(
  process.execPath,
  [
    require.resolve('prisma/build/index.js'),
    'migrate',
    'deploy',
    '--schema',
    fileURLToPath(new URL('../packages/db/prisma/schema.prisma', import.meta.url)),
  ],
  {
    env: { ...process.env, DATABASE_URL: direct },
    stdio: 'pipe',
    encoding: 'utf8',
    timeout: 120000,
  },
);
// Never emit connection strings or provider error bodies into build logs.
if (result.status !== 0) throw new Error(`DATABASE_MIGRATION_FAILED_${result.status ?? 'timeout'}`);
console.log('DATABASE_MIGRATIONS_VERIFIED');
