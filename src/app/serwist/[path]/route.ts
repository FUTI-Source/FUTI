import { randomUUID } from 'node:crypto';

import { createSerwistRoute } from '@serwist/turbopack';

import { SITE_PWA } from '~/site.config';

// CI 可用 BUILD_ID（提交号）作为离线页版本；本地构建用随机值保证每次构建都是新修订。
const revision = process.env.BUILD_ID ?? randomUUID();

export const { dynamic, dynamicParams, revalidate, generateStaticParams, GET } =
  createSerwistRoute({
    swSrc: SITE_PWA.swSrc,
    additionalPrecacheEntries: [{ url: SITE_PWA.offlineUrl, revision }],
    // Windows 上显式使用原生 esbuild，避免回退到 wasm 带来的体积与速度损耗。
    useNativeEsbuild: true,
  });
