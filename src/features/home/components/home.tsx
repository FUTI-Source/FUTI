'use client';

import React, { lazy, Suspense, useEffect, useState } from 'react';

import { AnimatePresence, LazyMotion } from 'motion/react';
import * as m from 'motion/react-m';

import { Live2D } from '@/features/live2d/components';
import { Loading } from '@/features/live2d/components/loading';
import { Live2DEvent } from '@/features/live2d/events';
import { ScrollArea } from '@/components/ui/scroll-area';

import { Description } from '@/features/profile/components/description';
import { Links } from '@/features/profile/components/links';
import { Name } from '@/features/profile/components/name';
import { ProfileWrapper } from '@/features/profile/components/wrapper';

import { DetroitBackground } from './background';
import { Footer } from './footer';
import { Header } from './header';

import { useWebMcpTools } from '@/features/webmcp/use-webmcp-tools';
import useEventEmitter from '@/hooks/use-event-emitter';
import { CONTACT_EMAIL, SITE_URL } from '@/lib/site';
import { initCustomCursor } from '../utils/custom-cursor';
import { identifyUmami, initUmami, trackEvent } from '@/utils/umami';

const loadMotionFeatures = () => import('@/components/ui/motion-features').then((module) => module.default);
const SITE_HOSTNAME = new URL(SITE_URL).hostname;
const EmailDialog = lazy(() =>
  import('@/features/mail/client/email-dialog').then(({ EmailDialog: Component }) => ({
    default: Component,
  })),
);

const Home: React.FC = () => {
  const [live2dVisible, setLive2dVisible] = useState(false);
  const [emailDialog, setEmailDialog] = useState<{ href: string; open: boolean } | null>(null);

  const handleEmailOpenChange = (open: boolean) => {
    setEmailDialog((current) => (current ? { ...current, open } : current));
  };

  useWebMcpTools(() => {
    trackEvent('contact-open', { source: 'webmcp' });
    setEmailDialog({ href: `mailto:${CONTACT_EMAIL}`, open: true });
  });

  const live2dEvent$ = useEventEmitter<Live2DEvent>();
  live2dEvent$.useSubscription((target) => {
    switch (target) {
      case Live2DEvent.LOADING:
      case Live2DEvent.FAILED: {
        trackEvent('live2d', { status: target === Live2DEvent.FAILED ? 'failed' : 'loading' });
        break;
      }
      case Live2DEvent.SHOW: {
        trackEvent('live2d', { status: 'shown' });
        break;
      }
    }
  });

  useEffect(() => {
    initUmami({
      url: 'https://umami.zhang-wentao.tech',
      websiteId: 'c53b1321-886d-4d04-b4a1-4c2010db6735',
      domains: `${SITE_HOSTNAME},${SITE_HOSTNAME.replace(/^www\./, '')}`,
      environment: process.env.NODE_ENV,
      doNotTrack: true,
      // UTM 参数存放在查询串里，开启 excludeSearch 会把 utm_* 一并丢弃，UTM 洞察将无数据
      excludeSearch: false,
      excludeHash: true,
      // 使用内置 Web Vitals 采集，替代自定义的 web-vitals 事件
      performance: true,
      // 采集未捕获异常与未处理的 Promise 拒绝，后台「监控 → 错误」查看
      errors: true,
    });

    identifyUmami({
      locale: navigator.language,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      standalone: window.matchMedia('(display-mode: standalone)').matches ? 'yes' : 'no',
      displayMode: ['standalone', 'fullscreen', 'minimal-ui', 'window-controls-overlay', 'browser'].find(
        (mode) => window.matchMedia(`(display-mode: ${mode})`).matches,
      ) ?? 'browser',
      screen: `${window.screen.width}x${window.screen.height}`,
    });
  }, []);

  useEffect(() => {
    if (live2dVisible) return;
    // 自动化环境（部署截图）立即挂载，让截图尽量拿到模型最终效果；
    // 未就绪时仍由进度圈占位。
    if (document.documentElement.classList.contains('preload-skip')) {
      setLive2dVisible(true);
      return;
    }
    const timer = window.setTimeout(() => setLive2dVisible(true), 1500);
    return () => window.clearTimeout(timer);
  }, [live2dVisible]);

  useEffect(() => {
    const destroyCursor = initCustomCursor();
    return () => destroyCursor();
  }, []);

  return (
    <LazyMotion features={loadMotionFeatures} strict>
      <ScrollArea className="futi-ui relative flex h-full w-full min-w-0 flex-col overflow-x-hidden overflow-y-auto pt-[var(--safe-top)] pb-[var(--safe-bottom)] box-border">
        <Header />
        <main className="flex flex-1 flex-col">
          <DetroitBackground />
          <div className="futi-home-stack my-auto flex w-full shrink-0 flex-col items-center gap-[clamp(0.75rem,1.8vh,1rem)] py-4 text-center">
            <ProfileWrapper className="futi-center futi-profile-reveal relative overflow-hidden">
              <AnimatePresence>
                {!live2dVisible && (
                  <m.div
                    key="futi-profile-loading"
                    className="absolute inset-0 flex items-center justify-center"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1, transition: { delay: 0.2 } }}
                    exit={{ opacity: 0, transition: { duration: 0.2 } }}
                  >
                    <Loading className="size-20 border-4" insideClassName="border-[3px]" />
                  </m.div>
                )}
              </AnimatePresence>
              {live2dVisible && <Live2D event$={live2dEvent$} />}
            </ProfileWrapper>
            <Name initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0, transition: { delay: 0.2 } }} transition={{ duration: 0.2 }} />
            <div className="h-7"><Description /></div>
            <Links
              onEmailClick={(href) => {
                trackEvent('contact-open', { source: 'profile' });
                setEmailDialog({ href, open: true });
              }}
            />
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
