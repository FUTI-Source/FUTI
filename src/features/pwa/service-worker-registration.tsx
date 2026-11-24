'use client';

import { useEffect } from 'react';

import { SOFT_REFRESH_EVENT } from '@/lib/app-events';

const UPDATE_CHECK_INTERVAL = 60 * 60 * 1000;

/** 页面里有弹窗打开时不要应用新版本，避免打断填写中的表单 */
const hasOpenDialog = () =>
  document.querySelector('[data-slot="dialog-content"]') !== null;

export const ServiceWorkerRegistration = () => {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator)) {
      return;
    }

    let registration: ServiceWorkerRegistration | undefined;
    let updateCheckInterval: number | undefined;
    let disposed = false;
    // 本次加载周期内只允许软刷新一次，避免 SW 反复激活造成刷新循环
    let softRefreshedForUpdate = false;
    // 页面加载时是否已被 SW 控制：未控制 = 首次安装，activate 的 claim 会触发
    // 一次 controllerchange，属于预期，不应刷新；已控制 = 版本更新，才需要软刷新。
    const hadController = Boolean(navigator.serviceWorker.controller);

    // 新 SW 进入 waiting 后立即接管，不像默认行为那样必须等所有标签页关闭。
    // 接管后不整页 reload，而是走软刷新，避免打断当前会话与全屏状态。
    const applyWaitingWorker = () => {
      if (disposed) return;
      const waitingWorker = registration?.waiting;
      if (!waitingWorker || hasOpenDialog()) return;

      waitingWorker.postMessage('SKIP_WAITING');
    };

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

    const handleControllerChange = () => {
      // 首次安装的 claim 不算更新，无需软刷新（当前页面已是新版 SW 服务）。
      // 每个加载周期只触发一次，避免 SW 反复激活造成刷新循环。
      if (!hadController || softRefreshedForUpdate) return;

      softRefreshedForUpdate = true;
      window.dispatchEvent(new CustomEvent(SOFT_REFRESH_EVENT));
    };

    // SW 发现旧页面引用了不存在的 chunk 时会清空缓存并通知这里；
    // 每个会话只自动重载一次，源站真的缺 chunk 时不至于无限刷新。
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type !== 'stale-cache') return;
      if (sessionStorage.getItem('sw-stale-reloaded') === '1') return;
      sessionStorage.setItem('sw-stale-reloaded', '1');
      window.location.reload();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkForUpdates();
      } else {
        applyWaitingWorker();
      }
    };

    window.addEventListener('online', checkForUpdates);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);
    navigator.serviceWorker.addEventListener('message', handleMessage);

    navigator.serviceWorker
      .register('/sw.js', { scope: '/', updateViaCache: 'none' })
      .then((serviceWorkerRegistration) => {
        if (disposed) return;

        registration = serviceWorkerRegistration;

        // update() 的 Promise 只保证检查完成，不等待新 SW 安装完毕；
        // 新 worker 进入 installed（waiting）后立刻接管，不再等页面切后台。
        serviceWorkerRegistration.addEventListener('updatefound', () => {
          const newWorker = serviceWorkerRegistration.installing;
          if (!newWorker) return;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              applyWaitingWorker();
            }
          });
        });

        updateCheckInterval = window.setInterval(
          checkForUpdates,
          UPDATE_CHECK_INTERVAL,
        );

        // 注册前已有页面处于 SW 控制时，本次才存在“更新”语义；
        // 首次安装无需处理，activate 里的 clients.claim 会接管。
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
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
      navigator.serviceWorker.removeEventListener('message', handleMessage);
    };
  }, []);

  return null;
};