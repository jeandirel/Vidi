import type { NextConfig } from 'next';
import { loadEnvConfig } from '@next/env';
import { resolve } from 'node:path';
loadEnvConfig(resolve(process.cwd(), '../..'));
const config: NextConfig = {
  transpilePackages: ['@vidi/core', '@vidi/db'],
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ];
  },
};
export default config;
