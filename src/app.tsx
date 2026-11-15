/* eslint-disable react-compiler/react-compiler */
import React, { useEffect, useState } from 'react';

import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';
import { AnimatePresence, motion } from 'framer-motion';

import { Live2D, Live2DEvent } from '@/components/ui/live2d';
import { ScrollArea } from '@/components/ui/scroll-area';

import { DetroitBackground } from '@/components/page/background.tsx';
import { Footer } from '@/components/page/footer.tsx';
import { Header } from '@/components/page/header.tsx';
import { Description } from '@/components/page/profile/introduction/description';
import { Links } from '@/components/page/profile/introduction/links';
import { Name } from '@/components/page/profile/introduction/name.tsx';
import { ProfileWrapper } from '@/components/page/profile/wrapper.tsx';

import profileImage from '@/assets/webp/futiwolf.webp';
import useEventEmitter from '@/hooks/use-event-emitter.ts';

import { initCustomCursor } from './utils/customCursor';
import { initContentProtection } from './utils/disableContextMenu';
import { initForceLightTheme } from './utils/forceLight';
import { initFullscreenShortcut } from './utils/fullscreen';
import { disableBrowserTranslate } from './utils/noTranslate';
import { initUmami } from './utils/umami';
import { initWebVitals } from './utils/webVitals';

initForceLightTheme();
disableBrowserTranslate();
initContentProtection();
initFullscreenShortcut();
initCustomCursor();

initUmami({
  url: 'https://umami.zhang-wentao.tech',
  websiteId: 'c53b1321-886d-4d04-b4a1-4c2010db6735',
  lang: 'en',
});

initWebVitals();

export const App: React.FC = () => {
  const [live2dVisible, setLive2dVisible] = useState(false);
  const [profileImageVisible, setProfileImageVisible] = useState(true);
  const [showUpdate, setShowUpdate] = useState(false);
  const [showToast, setShowToast] = useState(false);
  let newReg: ServiceWorkerRegistration | null = null;

  const live2dEvent$ = useEventEmitter<Live2DEvent>();
  live2dEvent$.useSubscription((target) => {
    switch (target) {
      case Live2DEvent.SHOW: {
        setProfileImageVisible(false);
        break;
      }
    }
  });

  useEffect(() => {
    if (live2dVisible) return;
    const timer = window.setTimeout(() => setLive2dVisible(true), 1500);
    return () => window.clearTimeout(timer);
  }, [live2dVisible]);

  const [nameVisible, setNameVisible] = useState(false);

  // SW 版本检测逻辑
  useEffect(() => {
    if (process.env.NODE_ENV === 'production' && 'serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          console.log('PWA 注册成功:', reg);
          newReg = reg;
          reg.addEventListener('waiting', () => {
            setShowUpdate(true);
          });
        })
        .catch((err) => console.error('PWA 注册失败:', err));
    }
  }, []);

  const handleConfirmUpdate = () => {
    if (!newReg?.waiting) return;
    newReg.waiting.postMessage({ type: 'SKIP_WAITING' });
    newReg.waiting.addEventListener('statechange', () => {
      if (newReg.waiting?.state === 'activated') {
        setShowToast(true);
        setTimeout(() => {
          window.location.reload();
        }, 1200);
      }
    });
  };

  const handleDismissUpdate = () => {
    setShowUpdate(false);
  };

  return (
    <>
      {/* 重点改动：增加 pt-[var(--safe-top)] pb-[var(--safe-bottom)] box-border */}
      <ScrollArea className="futi-ui relative h-full w-dvw min-w-max overflow-hidden pt-[var(--safe-top)] pb-[var(--safe-bottom)] box-border [&>[data-radix-scroll-area-viewport]>div]:!flex [&>[data-radix-scroll-area-viewport]>div]:h-full [&>[data-radix-scroll-area-viewport]>div]:flex-col">
        <Header />
        <main className="flex flex-1 flex-col">
          <DetroitBackground />
          <div className="flex h-full w-full flex-col items-center justify-center gap-4 text-center">
            <ProfileWrapper
              className="futi-center relative overflow-hidden"
              initial={{ opacity: 0, width: 0, height: 0 }}
              animate={{ opacity: 1, width: 256, height: 256 }}
              transition={{ duration: 0.2 }}
            >
              <AnimatePresence>
                {profileImageVisible && (
                  <motion.div key="futi-profile-image" className="absolute top-0 left-0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                    <img src={profileImage} alt="futiwolf,LF112" className="size-64" />
                  </motion.div>
                )}
              </AnimatePresence>
              {live2dVisible && <Live2D event$={live2dEvent$} />}
            </ProfileWrapper>
            <Name initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0, transition: { delay: 0.2 } }} transition={{ duration: 0.2 }} onAnimationComplete={() => setNameVisible(true)} />
            <div className="h-7">{nameVisible && <Description />}</div>
            <Links />
          </div>
        </main>
        <Footer />
      </ScrollArea>

      {/* 更新弹窗 */}
      <AnimatePresence>
        {showUpdate && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[9999] grid place-items-center bg-black/65 px-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-[360px] rounded-2xl bg-[#15161a] p-6 shadow-lg"
            >
              <h3 className="text-lg font-semibold text-gray-100">发现新版本</h3>
              <p className="mt-2 text-sm text-gray-400">刷新后体验最新内容</p>
              <div className="mt-5 flex justify-end gap-2.5">
                <button
                  onClick={handleDismissUpdate}
                  className="rounded-lg bg-[#272930] px-4 py-2 text-sm text-gray-200 transition-colors hover:bg-[#33353f]"
                >
                  稍后
                </button>
                <button
                  onClick={handleConfirmUpdate}
                  className="rounded-lg bg-[#5b6cf0] px-4 py-2 text-sm text-white transition-colors hover:bg-[#4858d8]"
                >
                  立即刷新
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toast 成功提示 */}
      <AnimatePresence>
        {showToast && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-8 left-1/2 z-[9999] -translate-x-1/2 rounded-xl bg-[#272930] px-5 py-3 text-sm text-gray-100 shadow-lg"
          >
            ✅ 新版本已就绪，正在刷新…
          </motion.div>
        )}
      </AnimatePresence>

      <Analytics />
      <SpeedInsights />
    </>
  );
};
