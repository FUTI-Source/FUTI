'use client';

import React, { lazy, Suspense, useEffect, useState } from 'react';

import { AnimatePresence, LazyMotion } from 'motion/react';
import * as m from 'motion/react-m';

import { Live2D } from '@/features/live2d/components';
import { Live2DEvent } from '@/features/live2d/events';
import { ScrollArea } from '@/components/ui/scroll-area';
import Image from 'next/image';

import { Description } from '@/features/profile/components/description';
import { Links } from '@/features/profile/components/links';
import { Name } from '@/features/profile/components/name';
import { ProfileWrapper } from '@/features/profile/components/wrapper';

import { DetroitBackground } from './background';
import { Footer } from './footer';
import { Header } from './header';

import profileImage from '@/assets/webp/futiwolf.webp';
import useEventEmitter from '@/hooks/use-event-emitter';
import { initCustomCursor } from '../utils/custom-cursor';
import { initUmami } from '@/utils/umami';
import { initWebVitals } from '@/utils/webVitals';

const loadMotionFeatures = () => import('@/components/ui/motion-features').then((module) => module.default);
const EmailDialog = lazy(() =>
  import('@/features/mail/client/email-dialog').then(({ EmailDialog: Component }) => ({
    default: Component,
  })),
);

const Home: React.FC = () => {
  const [live2dVisible, setLive2dVisible] = useState(false);
  const [profileImageVisible, setProfileImageVisible] = useState(true);
  const [emailDialog, setEmailDialog] = useState<{ href: string; open: boolean } | null>(null);

  const handleEmailOpenChange = (open: boolean) => {
    setEmailDialog((current) => (current ? { ...current, open } : current));
  };

  const live2dEvent$ = useEventEmitter<Live2DEvent>();
  live2dEvent$.useSubscription((target) => {
    switch (target) {
      case Live2DEvent.LOADING:
      case Live2DEvent.FAILED: {
        setProfileImageVisible(true);
        break;
      }
      case Live2DEvent.SHOW: {
        setProfileImageVisible(false);
        break;
      }
    }
  });

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

  const [nameVisible, setNameVisible] = useState(false);

  return (
    <LazyMotion features={loadMotionFeatures} strict>
      <ScrollArea className="futi-ui relative flex h-full w-full min-w-0 flex-col overflow-x-hidden overflow-y-auto pt-[var(--safe-top)] pb-[var(--safe-bottom)] box-border">
        <Header />
        <main className="flex flex-1 flex-col">
          <DetroitBackground />
          <div className="my-auto flex w-full shrink-0 flex-col items-center gap-[clamp(0.75rem,1.8vh,1rem)] py-4 text-center">
            <ProfileWrapper className="futi-center futi-profile-reveal relative overflow-hidden">
              <AnimatePresence>
                {profileImageVisible && (
                  <m.div key="futi-profile-image" className="absolute top-0 left-0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                    <Image
                      src={profileImage}
                      alt="FUTI 个人头像"
                      className="size-full bg-none"
                      sizes="(max-width: 640px) 48vw, 240px"
                      quality={80}
                      decoding="async"
                      priority
                    />
                  </m.div>
                )}
              </AnimatePresence>
              {live2dVisible && <Live2D event$={live2dEvent$} />}
            </ProfileWrapper>
            <Name initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0, transition: { delay: 0.2 } }} transition={{ duration: 0.2 }} onAnimationComplete={() => setNameVisible(true)} />
            <div className="h-7">{nameVisible && <Description />}</div>
            <Links onEmailClick={(href) => setEmailDialog({ href, open: true })} />
          </div>
        </main>
        <Footer />
      </ScrollArea>
      {emailDialog && (
        <Suspense fallback={null}>
          <EmailDialog
            href={emailDialog.href}
            open={emailDialog.open}
            onOpenChange={handleEmailOpenChange}
          />
        </Suspense>
      )}
    </LazyMotion>
  );
};

export default Home;
