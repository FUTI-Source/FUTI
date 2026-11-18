'use client';

import { useEffect } from 'react';

const UPDATE_CHECK_INTERVAL = 60 * 60 * 1000;

export const ServiceWorkerRegistration = () => {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator)) {
      return;
    }

    const wasControlled = Boolean(navigator.serviceWorker.controller);
    let registration: ServiceWorkerRegistration | undefined;
    let updateCheckInterval: number | undefined;
    let disposed = false;
    let isReloading = false;

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

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkForUpdates();
      }
    };

    const handleControllerChange = () => {
      if (!wasControlled || isReloading) return;
      isReloading = true;
      window.location.reload();
    };

    window.addEventListener('online', checkForUpdates);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    navigator.serviceWorker.addEventListener(
      'controllerchange',
      handleControllerChange,
    );

    navigator.serviceWorker
      .register('/sw.js', { scope: '/', updateViaCache: 'none' })
      .then((serviceWorkerRegistration) => {
        if (disposed) return;

        registration = serviceWorkerRegistration;
        checkForUpdates();
        updateCheckInterval = window.setInterval(
          checkForUpdates,
          UPDATE_CHECK_INTERVAL,
        );
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
      navigator.serviceWorker.removeEventListener(
        'controllerchange',
        handleControllerChange,
      );
    };
  }, []);

  return null;
};
