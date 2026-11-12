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

import { initContentProtection } from './utils/disableContextMenu';
import { initFullscreenShortcut } from './utils/fullscreen';
import { disableBrowserTranslate } from './utils/noTranslate';
import { initUmami } from './utils/umami';
import { initWebVitals } from './utils/webVitals';

// 1. 禁止浏览器自动翻译
disableBrowserTranslate();

// 2. 全站防右键、防复制与快捷键保护（仅生产环境生效）
initContentProtection();

// 3. 全屏快捷键（Alt + Enter 切换全屏）
initFullscreenShortcut();

// 4. 初始化自建 Umami 统计与页面 lang
initUmami({
  url: 'https://zhang-wentao.tech',
  websiteId: 'c53b1321-886d-4d04-b4a1-4c2010db6735',
  lang: 'en',
});

// 5. 初始化 Web Vitals 性能上报
initWebVitals();

if (process.env.NODE_ENV === 'production' && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => console.log('PWA 注册成功:', reg))
      .catch((err) => console.error('PWA 注册失败:', err));
  });
}

export const App: React.FC = () => {
  const [live2dVisible, setLive2dVisible] = useState(false);
  const [profileImageVisible, setProfileImageVisible] = useState(true);

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
    if (!live2dVisible) {
      setTimeout(() => setLive2dVisible(true), 1500);
    }
  }, []);

  const [nameVisible, setNameVisible] = useState(false);

  return (
    <>
      <ScrollArea className="futi-ui relative h-full w-dvw min-w-max overflow-hidden [&>[data-radix-scroll-area-viewport]>div]:!flex [&>[data-radix-scroll-area-viewport]>div]:h-full [&>[data-radix-scroll-area-viewport]>div]:flex-col">
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
                  <motion.div
                    key="futi-profile-image"
                    className="absolute top-0 left-0"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <img src={profileImage} alt="futiwolf,LF112" className="size-64" />
                  </motion.div>
                )}
              </AnimatePresence>
              {live2dVisible && <Live2D event$={live2dEvent$} />}
            </ProfileWrapper>
            <Name
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0, transition: { delay: 0.2 } }}
              transition={{ duration: 0.2 }}
              onAnimationComplete={() => setNameVisible(true)}
            />
            <div className="h-7">{nameVisible && <Description />}</div>
            <Links />
          </div>
        </main>
        <Footer />
      </ScrollArea>
      <Analytics />
      <SpeedInsights />
    </>
  );
};
