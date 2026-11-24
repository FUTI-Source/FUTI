const CACHE_VERSION = 'v10';
const CACHE_NAME = `site-${CACHE_VERSION}`;
const PRECACHE_URLS = [
  '/',
  '/manifest.webmanifest',
  '/favicon.ico',
  '/icon-192x192.png',
  '/icon-512x512.png',
  '/apple-touch-icon.png',
  '/fonts/Geometos.woff',
  '/fonts/Kanit-300.woff2',
  '/fonts/Kanit-400.woff2',
  '/fonts/Ubuntu.woff2',
  '/offline.html',
];
const STATIC_DESTINATIONS = new Set(['font', 'image', 'script', 'style', 'worker']);

// 宿主页面发来 SKIP_WAITING 时立即接管，避免更新卡在 waiting 状态、
// 必须关闭所有标签页才能生效。配合注册端的空闲触发使用。
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);

      await Promise.all(
        PRECACHE_URLS.map(async (url) => {
          try {
            const response = await fetch(url, { cache: 'reload' });
            if (response.ok) {
              await cache.put(url, response);
            }
          } catch (error) {
            console.warn(`Unable to precache ${url}`, error);
          }
        }),
      );

    })(),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames
          .filter((name) => name.startsWith('site-') && name !== CACHE_NAME)
          .map((name) => caches.delete(name)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (
    request.method !== 'GET' ||
    url.origin !== self.location.origin ||
    url.pathname.startsWith('/api/')
  ) {
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_NAME);

        // 导航请求的缓存键去掉查询串，避免令牌等敏感参数残留在 Cache Storage
        const cacheKey = new URL(request.url);
        cacheKey.search = '';
        const cacheRequest = new Request(cacheKey.toString(), {
          method: 'GET',
          headers: request.headers,
          mode: request.mode,
          credentials: request.credentials,
          cache: request.cache,
          redirect: request.redirect,
          referrer: request.referrer,
          integrity: request.integrity,
        });

        try {
          const response = await fetch(request);
          if (response.ok) {
            try {
              await cache.put(cacheRequest, response.clone());
            } catch (error) {
              console.warn('Unable to cache page navigation', error);
            }
          }
          return response;
        } catch {
          return (
            (await cache.match(cacheRequest)) ||
            (await cache.match('/')) ||
            (await cache.match('/offline.html')) ||
            new Response('<h1>当前处于离线状态</h1>', {
              headers: { 'Content-Type': 'text/html; charset=utf-8' },
            })
          );
        }
      })(),
    );
    return;
  }

  if (
    !STATIC_DESTINATIONS.has(request.destination) &&
    !url.pathname.startsWith('/_next/static/') &&
    !url.pathname.startsWith('/live2d/')
  ) {
    return;
  }

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      const cachedResponse = await cache.match(request);
      if (cachedResponse) return cachedResponse;

      const response = await fetch(request);
      if (response.ok) {
        try {
          await cache.put(request, response.clone());
        } catch (error) {
          console.warn(`Unable to cache ${url.pathname}`, error);
        }
      }
      return response;
    })(),
  );
});
