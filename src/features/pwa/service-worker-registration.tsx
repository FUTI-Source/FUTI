'use client';

import { useEffect } from 'react';

import { PAGE_RESTORE_EVENT, SOFT_REFRESH_EVENT } from '@/lib/app-events';

const UPDATE_CHECK_INTERVAL = 60 * 60 * 1000;

/** 页面里有弹窗打开时不要刷新，避免打断填写中的表单 */
const hasOpenDialog = () =>
  document.querySelector('[data-slot="dialog-content"]') !== null;

/**
 * Service Worker 注册与更新协调。
 *
 * 关键约束（后台切回白屏的根因）：
 * 1. 绝不在页面进入后台时激活 waiting worker。旧页面仍持有旧构建的 chunk URL，
 *    此时换掉 SW 缓存会让恢复后的懒加载 chunk 404，进而白屏。
 *    新版本统一等到「页面回到前台」且空闲时再应用。
 * 2. SW 报 stale-cache（旧 HTML 引用已删除的 chunk）时不再删缓存 + 立即 reload：
 *    删缓存会连带清掉导航兜底页，弱网下 reload 无内容可退，直接白屏。
 *    改为发软刷新信号，走 Next.js RSC 更新，保留当前 DOM 与会话。
 */
export const ServiceWorkerRegistration = () => {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator)) {
      return;
    }

    let registration: ServiceWorkerRegistration | undefined;
    let updateCheckInterval: number | undefined;
    let disposed = false;
    let refreshScheduled = false;
    const hadController = Boolean(navigator.serviceWorker.controller);

    // 检查更新：只在页面可见、在线时进行
    const checkForUpdates = () => {
      if (
        !registration ||
        !navigator.onLine ||
        document.visibilityState !== 'visible'
      ) {
        return;
      }
      void registration.update().catch((error: unknown) => {
        console.error('Service worker update check failed', error);
      });
    };

    // 应用新版本：只在前台、无弹窗、有 waiting worker 时调用。
    // SKIP_WAITING 后新 SW 接管会触发 controllerchange，再走一次软刷新。
    const applyWaitingWorker = () => {
      if (disposed || document.visibilityState !== 'visible' || hasOpenDialog()) {
        return;
      }
      registration?.waiting?.postMessage('SKIP_WAITING');
    };

    // 新 SW 接管。首次安装的 claim 不算更新；每个加载周期只软刷新一次。
    const handleControllerChange = () => {
      if (!hadController || refreshScheduled) return;
      refreshScheduled = true;
      window.dispatchEvent(new CustomEvent(SOFT_REFRESH_EVENT));
    };

    // 旧 chunk 失效：走软刷新而非删缓存 + 硬 reload，避免导航兜底被清空后白屏。
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type !== 'stale-cache' || refreshScheduled) return;
      refreshScheduled = true;
      window.dispatchEvent(new CustomEvent(SOFT_REFRESH_EVENT));
    };

    // 页面从后台恢复时：先检查更新，再把已 waiting 的新版本在前台应用。
    const handleRestore = () => {
      checkForUpdates();
      applyWaitingWorker();
    };

    window.addEventListener('online', checkForUpdates);
    window.addEventListener(PAGE_RESTORE_EVENT, handleRestore);
    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);
    navigator.serviceWorker.addEventListener('message', handleMessage);

    navigator.serviceWorker
      .register('/sw.js', { scope: '/', updateViaCache: 'none' })
      .then((serviceWorkerRegistration) => {
        if (disposed) return;
        registration = serviceWorkerRegistration;

        // 新 worker 安装完成进入 waiting 时，不在后台抢占；
        // 等页面恢复可见由 handleRestore 统一处理，避免旧页面 chunk 失效。
        updateCheckInterval = window.setInterval(
          checkForUpdates,
          UPDATE_CHECK_INTERVAL,
        );

        // 页面加载时若已有 waiting worker，延后到前台空闲再应用
        if (serviceWorkerRegistration.waiting && navigator.serviceWorker.controller) {
          applyWaitingWorker();
        }
      })
      .catch((error: unknown) => {
        console.error('Service worker registration failed', error);
      });

    return () => {
      disposed = true;
      if (updateCheckInterval !== undefined) {
        window.clearInterval(updateCheckInterval);
      }
      window.removeEventListener('online', checkForUpdates);
      window.removeEventListener(PAGE_RESTORE_EVENT, handleRestore);
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
      navigator.serviceWorker.removeEventListener('message', handleMessage);
    };
  }, []);

  return null;
};
