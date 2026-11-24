
import { useEffect } from 'react';

const UPDATE_CHECK_INTERVAL = 60 * 60 * 1000;

const hasOpenDialog = () =>
    document.querySelector('[data-slot="dialog-content"]') !== null;

export const ServiceWorkerRegistration = () => {
    useEffect(() => {
        // 确保仅在客户端执行
        if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
            return;
        }

        let registration: ServiceWorkerRegistration | undefined;
        let updateCheckInterval: number | undefined;
        let disposed = false;
        let reloadedForUpdate = false;
        
        const hadController = Boolean(navigator.serviceWorker.controller);

        const checkForUpdates = () => {
            if (!registration || !navigator.onLine || document.visibilityState !== 'visible') return;
            void registration.update().catch(console.error);
        };

        const applyWaitingWorker = () => {
            const waitingWorker = registration?.waiting;
            if (!waitingWorker || hasOpenDialog()) return;
            waitingWorker.postMessage('SKIP_WAITING');
        };

        // ✅ 修正后的逻辑
        const handleControllerChange = () => {
            if (!hadController || reloadedForUpdate || document.visibilityState !== 'hidden') {
                return;
            }
            reloadedForUpdate = true;
            // 使用 replace 代替 reload，Android 上体验更好
            window.location.replace(window.location.href);
        };

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                checkForUpdates();
            } else {
                applyWaitingWorker();
            }
        };

        // 注册监听
        window.addEventListener('online', checkForUpdates);
        document.addEventListener('visibilitychange', handleVisibilityChange);
        navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);

        // 注册 SW
        navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' })
            .then((reg) => {
                if (disposed) return;
                registration = reg;
                updateCheckInterval = window.setInterval(checkForUpdates, UPDATE_CHECK_INTERVAL);
                if (reg.waiting && navigator.serviceWorker.controller) {
                    applyWaitingWorker();
                }
            })
            .catch(console.error);

        return () => {
            disposed = true;
            if (updateCheckInterval) window.clearInterval(updateCheckInterval);
            window.removeEventListener('online', checkForUpdates);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
        };
    }, []);

    return null;
};