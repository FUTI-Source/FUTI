'use client';

import { useEffect } from 'react';

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
        // 本次加载周期内只允许静默刷新一次，刷新失败时不再反复重试
        let reloadedForUpdate = false;
        // 页面加载时是否已被 SW 控制：未控制 = 首次安装，activate 的 claim 会触发
        // 一次 controllerchange，属于预期，不应刷新；已控制 = 版本更新，才需要静默刷新。
        const hadController = Boolean(navigator.serviceWorker.controller);

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

        // 新 SW 进入 waiting 后不立即接管（可能让在用的分块与新版 HTML 错位），
        // 也不像默认行为那样必须等所有标签页关闭；
        // 而是在页面切到后台的空闲时刻静默接管并刷新，用户回来时已是新版本。
        const applyWaitingWorker = () => {
            const waitingWorker = registration ?.waiting;
            if (!waitingWorker || hasOpenDialog()) return;

            waitingWorker.postMessage('SKIP_WAITING');
        };

        const handleControllerChange = () => {
            // 首次安装的 claim 不算更新，无需刷新
            // 只在后台静默刷新；前台可见时不打断用户
            if (
                !hadController ||
                reloadedForUpdate ||
                document.visibilityState !== 'hidden'
            ) {
                return;
            }
            reloadedForUpdate = true;

            // ✅ 修复：使用同源导航代替 reload，避免 PWA standalone 模式退出全屏
            window.location.href = window.location.href;
            // 或更推荐：window.location.replace(window.location.href); // 不增加浏览器历史记录
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

        navigator.serviceWorker
            .register('/sw.js', { scope: '/', updateViaCache: 'none' })
            .then((serviceWorkerRegistration) => {
                if (disposed) return;

                registration = serviceWorkerRegistration;
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
        };
    }, []);

    return null;
};
