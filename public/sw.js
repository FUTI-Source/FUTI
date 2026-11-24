// 每次发布都要递增：旧页面缓存里可能引用已被新构建删除的 chunk，必须整体清掉
const CACHE_VERSION = 'v13';
const CACHE_NAME = `site-${CACHE_VERSION}`;
/** 导航请求最长等待时间；超时后用缓存兜底，避免弱网下白屏等待 */
const NAVIGATION_TIMEOUT = 8000;
const PRECACHE_URLS = [
  '/',
  '/manifest.webmanifest',
  '/favicon.ico',
  '/icon-192x192.png',
  '/icon-512x512.png',
  '/apple-touch-icon.png',
  '/fonts/nunito-latin-variable.woff2',
  '/fonts/zcool-kuaile-sc.woff2',
  '/offline.html',
];
const STATIC_DESTINATIONS = new Set(['font', 'image', 'script', 'style', 'worker']);
/** 这些目录的文件会随版本更新，命中缓存后仍需后台刷新（stale-while-revalidate） */
const MUTABLE_PREFIXES = ['/live2d/', '/docs/'];

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
          credentials: request.credentials,
          cache: request.cache,
          redirect: request.redirect,
          referrer: request.referrer,
          integrity: request.integrity,
        });

        // 网络优先，但设超时：弱网下不要把白屏时间无限拉长
        const controller = typeof AbortController === 'function' ? new AbortController() : null;
        const timer = controller
          ? setTimeout(() => controller.abort(), NAVIGATION_TIMEOUT)
          : null;

        try {
          const response = await fetch(
            request,
            controller ? { signal: controller.signal } : undefined,
          );
          if (timer) clearTimeout(timer);
          if (response.ok) {
            const copy = response.clone();
            event.waitUntil(
              cache.put(cacheRequest, copy).catch((error) => {
                console.warn('Unable to cache page navigation', error);
              }),
            );
          }
          return response;
        } catch (error) {
          if (timer) clearTimeout(timer);
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

  const isStatic =
    STATIC_DESTINATIONS.has(request.destination) ||
    url.pathname.startsWith('/_next/static/') ||
    MUTABLE_PREFIXES.some((prefix) => url.pathname.startsWith(prefix));
  if (!isStatic) {
    return;
  }

  // 范围请求（如 Live2D 模型分段加载）只能拿到部分响应，写入缓存会污染后续完整请求
  const canCache = !request.headers.has('range');
  const shouldRevalidate = MUTABLE_PREFIXES.some((prefix) =>
    url.pathname.startsWith(prefix),
  );

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      const cachedResponse = await cache.match(request);

      // stale-while-revalidate：可变资源先返回缓存，后台异步拉取新版本写回缓存
      if (cachedResponse && shouldRevalidate) {
        event.waitUntil(
          fetch(request)
            .then((response) => {
              if (response.ok && canCache) return cache.put(request, response.clone());
            })
            .catch(() => {}),
        );
        return cachedResponse;
      }

      // 带内容哈希的静态资源与首次命中的资源：直接用缓存，避免多余回源
      if (cachedResponse) return cachedResponse;

      const response = await fetch(request);
      if (response.ok && canCache) {
        const copy = response.clone();
        event.waitUntil(cache.put(request, copy));
      }
      return response;
    })(),
  );
});
