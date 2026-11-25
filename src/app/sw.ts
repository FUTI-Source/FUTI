/// <reference lib="esnext" />
/// <reference lib="webworker" />

import { defaultCache } from '@serwist/turbopack/worker';
import type { PrecacheEntry, SerwistGlobalConfig } from 'serwist';
import { NetworkOnly, Serwist } from 'serwist';

// SW 由 esbuild 单独编译，不能用 tsconfig 的 ~ 别名，使用相对路径引入站点配置。
import { SITE_PWA } from '../../site.config';

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: SITE_PWA.skipWaiting,
  clientsClaim: SITE_PWA.clientsClaim,
  navigationPreload: SITE_PWA.navigationPreload,
  runtimeCaching: [
    // 支付、留言与状态接口必须实时：放在 defaultCache 之前，避免落入通用 NetworkFirst 缓存。
    {
      matcher: ({ sameOrigin, url: { pathname } }) =>
        sameOrigin && pathname.startsWith(SITE_PWA.apiPrefix),
      handler: new NetworkOnly(),
    },
    ...defaultCache,
  ],
  fallbacks: {
    entries: [
      {
        url: SITE_PWA.offlineUrl,
        matcher({ request }) {
          return request.destination === 'document';
        },
      },
    ],
  },
});

serwist.addEventListeners();
