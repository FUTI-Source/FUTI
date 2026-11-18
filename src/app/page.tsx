'use client';

import React, { useEffect, useState } from 'react';

import { AnimatePresence, motion } from 'framer-motion';

import { Live2D, Live2DEvent } from '@/components/ui/live2d';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Image } from '@/components/ui/image';

import { DetroitBackground } from '@/components/page/background';
import { Footer } from '@/components/page/footer';
import { Header } from '@/components/page/header';
import { Description } from '@/components/page/profile/introduction/description';
import { Links } from '@/components/page/profile/introduction/links';
import { Name } from '@/components/page/profile/introduction/name';
import { ProfileWrapper } from '@/components/page/profile/wrapper';

import profileImage from '@/assets/webp/futiwolf.webp';
import useEventEmitter from '@/hooks/use-event-emitter';
import { initCustomCursor } from '@/utils/customCursor';
import { initContentProtection } from '@/utils/disableContextMenu';
import { initForceLightTheme } from '@/utils/forceLight';
import { initFullscreenShortcut } from '@/utils/fullscreen';
import { disableBrowserTranslate } from '@/utils/noTranslate';
import { initUmami } from '@/utils/umami';
import { initWebVitals } from '@/utils/webVitals';

const Home: React.FC = () => {
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
    initForceLightTheme();
    disableBrowserTranslate();
    const cleanupProtection = initContentProtection();
    const cleanupFullscreen = initFullscreenShortcut();
    return () => {
      cleanupProtection?.();
      cleanupFullscreen?.();
    };
  }, []);

  useEffect(() => {
    initUmami({
      url: 'https://umami.zhang-wentao.tech',
      websiteId: 'c53b1321-886d-4d04-b4a1-4c2010db6735',
      lang: 'en',
    });
    initWebVitals();
  }, []);

  useEffect(() => {
    if (live2dVisible) return;
    const timer = window.setTimeout(() => setLive2dVisible(true), 1500);
    return () => window.clearTimeout(timer);
  }, [live2dVisible]);

  useEffect(() => {
    const destroyCursor = initCustomCursor();
    return () => destroyCursor();
  }, []);

  useEffect(() => {
    const clickHandler = (e: MouseEvent) => {
      const link = (e.target as HTMLElement).closest('a');
      if (!link) return;

      if (e.ctrlKey || e.metaKey || e.shiftKey || e.button === 1) {
        e.preventDefault();
      }
      if (link.target === '_blank') {
        link.removeAttribute('target');
      }
    };

    const originalOpen = window.open;
    window.open = function (url?: string | URL) {
      if (url) {
        window.location.assign(url.toString());
        return null;
      }
      return originalOpen(url);
    };

    document.addEventListener('click', clickHandler);
    return () => {
      document.removeEventListener('click', clickHandler);
      window.open = originalOpen;
    };
  }, []);

  const [nameVisible, setNameVisible] = useState(false);

  return (
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
                  <Image src={profileImage} alt="futiwolf,LF112" className="size-64" />
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
  );
};

export default Home;
