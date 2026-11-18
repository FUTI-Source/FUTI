const CACHE_NAME = 'futi-site-v3';
const PRECACHE_URLS = [
  '/',
  '/manifest.webmanifest',
  '/favicon.ico',
  '/icon-192.png',
  '/icon-512.png',
  '/og-image.png',
  '/fonts/Geometos.woff',
  '/fonts/Kanit-300.woff2',
  '/fonts/Kanit-400.woff2',
  '/fonts/MonaspaceNeon.woff',
  '/fonts/Ubuntu.woff2',
  '/offline.html',
];
const STATIC_DESTINATIONS = new Set(['font', 'image', 'script', 'style', 'worker']);

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

      await self.skipWaiting();
    })(),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames
          .filter((name) => name.startsWith('futi-site-') && name !== CACHE_NAME)
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

        try {
          const response = await fetch(request);
          if (response.ok) {
            try {
              await cache.put(request, response.clone());
            } catch (error) {
              console.warn('Unable to cache page navigation', error);
            }
          }
          return response;
        } catch {
          return (
            (await cache.match(request)) ||
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
