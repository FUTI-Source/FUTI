'use client';

import { SerwistProvider } from '@serwist/turbopack/react';
import { useEffect, useState, type ReactNode } from 'react';

import { SITE_PWA } from '~/site.config';

/**
 * 迁移清理：旧版本把 SW 注册在 /sw.js，文件删除后浏览器仍会尝试更新它并报 404。
 * 新 SW 注册前先注销旧 registration，并删除旧的手写缓存，避免继续请求不存在的脚本。
 */
async function cleanupLegacyServiceWorker() {
  if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(
        registrations
          .filter((registration) =>
            [registration.installing, registration.waiting, registration.active].some((worker) => {
              if (!worker) return false;
              try {
                return new URL(worker.scriptURL).pathname === SITE_PWA.legacySwPath;
              } catch {
                return false;
              }
            }),
          )
          .map((registration) => registration.unregister()),
      );
    } catch {
      // 清理失败不应阻塞新 SW 注册
    }
  }

  if (typeof caches === 'undefined') return;
  try {
    const names = await caches.keys();
    await Promise.all(
      names
        .filter((name) => name.startsWith(SITE_PWA.legacyCachePrefix))
        .map((name) => caches.delete(name)),
    );
  } catch {
    // 隐私模式下 Cache Storage 可能不可用，忽略即可
  }
}

export function PwaRegistration({ children }: { children: ReactNode }) {
  const isProduction = process.env.NODE_ENV === 'production';
  const [ready, setReady] = useState(!isProduction);

  useEffect(() => {
    if (ready) return;

    let disposed = false;
    void cleanupLegacyServiceWorker().finally(() => {
      if (!disposed) setReady(true);
    });

    return () => {
      disposed = true;
    };
  }, [ready]);

  if (!ready) return <>{children}</>;

  return (
    <SerwistProvider
      swUrl={SITE_PWA.swUrl}
      disable={!isProduction}
      cacheOnNavigation={SITE_PWA.cacheOnNavigation}
      reloadOnOnline={SITE_PWA.reloadOnOnline}
      options={{ scope: SITE_PWA.scope, updateViaCache: SITE_PWA.updateViaCache }}
    >
      {children}
    </SerwistProvider>
  );
}
