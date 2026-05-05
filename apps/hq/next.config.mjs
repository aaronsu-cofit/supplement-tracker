import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  outputFileTracingRoot: path.join(__dirname, '../../'),
  transpilePackages: ['@vitera/ui', '@vitera/lib'],
  // Baked at build time so the sidebar can show "上次部署：YYYY-MM-DD HH:mm".
  // Vercel sets VERCEL_GIT_COMMIT_SHA automatically; falls back to a fresh
  // ISO timestamp on every local build.
  env: {
    NEXT_PUBLIC_BUILD_TIME: new Date().toISOString(),
    NEXT_PUBLIC_GIT_SHA:
      process.env.VERCEL_GIT_COMMIT_SHA ||
      process.env.GIT_SHA ||
      '',
  },
};

export default nextConfig;
