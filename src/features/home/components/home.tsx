'use client';

import React, { lazy, Suspense, useEffect, useState } from 'react';

import { AnimatePresence, LazyMotion } from 'motion/react';
import * as m from 'motion/react-m';

import { Avatar } from '@/features/avatar/components/avatar';
import { Loading } from '@/features/avatar/components/loading';
import { AvatarEvent } from '@/features/avatar/events';
import { ScrollArea } from '@/components/ui/scroll-area';

import { Description } from '@/features/profile/components/description';
import { Links } from '@/features/profile/components/links';
import { Name } from '@/features/profile/components/name';
import { ProfileWrapper } from '@/features/profile/components/wrapper';

import { DetroitBackground } from './background';
import { Footer } from './footer';
import { Header } from './header';

import type { DonateResult } from '@/features/donate/types';
import useEventEmitter from '@/hooks/use-event-emitter';
import {
  SITE_ANALYTICS_DOMAINS,
  SITE_ANALYTICS_URL,
  SITE_ANALYTICS_WEBSITE_ID,
} from '@/lib/site';
import { identifyUmami, initUmami, trackEvent } from '@/lib/umami';

const loadMotionFeatures = () => import('@/components/ui/motion-features').then((module) => module.default);
const ContactDialog = lazy(() =>
  import('@/features/contact/client/contact-dialog').then(({ ContactDialog: Component }) => ({
    default: Component,
  })),
);
const DonateDialog = lazy(() =>
  import('@/features/donate/client/donate-dialog').then(({ DonateDialog: Component }) => ({
    default: Component,
  })),
);

const Home: React.FC = () => {
  const [avatarVisible, setAvatarVisible] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [donateOpen, setDonateOpen] = useState(false);
  const [donateResult, setDonateResult] = useState<DonateResult | null>(null);

  // 支付宝/微信 H5 支付完成后带令牌回到站点，打开结果并清理地址栏
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const donate = params.get('donate');
    if (donate !== 'success' && donate !== 'cancel') return;

    setDonateResult({
      status: donate,
      token: params.get('token') ?? undefined,
    });
    setDonateOpen(true);

    params.delete('donate');
    params.delete('token');
    params.delete('orderId');
    params.delete('out_trade_no');
    const search = params.toString();
    window.history.replaceState(
      null,
      '',
      `${window.location.pathname}${search ? `?${search}` : ''}${window.location.hash}`,
    );
  }, []);

  const handleContactOpenChange = (open: boolean) => {
    setContactOpen(open);
  };

  const avatarEvent$ = useEventEmitter<AvatarEvent>();
  avatarEvent$.useSubscription((target) => {
    switch (target) {
      case AvatarEvent.LOADING:
      case AvatarEvent.FAILED: {
        trackEvent('avatar', { status: target === AvatarEvent.FAILED ? 'failed' : 'loading' });
        break;
      }
      case AvatarEvent.SHOW: {
        trackEvent('avatar', { status: 'shown' });
        break;
      }
    }
  });

  useEffect(() => {
    initUmami({
      url: SITE_ANALYTICS_URL,
      websiteId: SITE_ANALYTICS_WEBSITE_ID,
      domains: SITE_ANALYTICS_DOMAINS,
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
    if (avatarVisible) return;
    // 自动化环境（部署截图）立即挂载，让截图尽量拿到模型最终效果；
    // 未就绪时仍由进度圈占位。
    if (document.documentElement.classList.contains('preload-skip')) {
      setAvatarVisible(true);
      return;
    }
    const timer = window.setTimeout(() => setAvatarVisible(true), 1500);
    return () => window.clearTimeout(timer);
  }, [avatarVisible]);

  return (
    <LazyMotion features={loadMotionFeatures} strict>
      <ScrollArea className="ui-transition relative flex h-full w-full min-w-0 flex-col overflow-x-hidden overflow-y-auto pt-[var(--safe-top)] pb-[var(--safe-bottom)] box-border">
        <Header />
        <main className="flex flex-1 flex-col">
          <DetroitBackground />
          <div className="home-stack my-auto flex w-full shrink-0 flex-col items-center gap-[clamp(0.75rem,1.8vh,1rem)] py-4 text-center">
            <ProfileWrapper className="flex-center profile-reveal relative overflow-hidden">
              <AnimatePresence>
                {!avatarVisible && (
                  <m.div
                    key="profile-loading"
                    className="profile-loading absolute inset-0 flex items-center justify-center"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1, transition: { delay: 0.2 } }}
                    exit={{ opacity: 0, transition: { duration: 0.2 } }}
                  >
                    <Loading className="size-20 border-4" insideClassName="border-[3px]" />
                  </m.div>
                )}
              </AnimatePresence>
              {avatarVisible && <Avatar event$={avatarEvent$} />}
            </ProfileWrapper>
            <Name initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0, transition: { delay: 0.2 } }} transition={{ duration: 0.2 }} />
            <div className="h-7"><Description /></div>
            <Links
              onContactClick={() => {
                trackEvent('contact-open', { source: 'profile' });
                setContactOpen(true);
              }}
              onDonateClick={() => {
                trackEvent('donate-open', { source: 'profile' });
                setDonateOpen(true);
              }}
            />
          </div>
        </main>
        <Footer />
      </ScrollArea>
      {contactOpen && (
        <Suspense fallback={null}>
          <ContactDialog
            open={contactOpen}
            onOpenChange={handleContactOpenChange}
          />
        </Suspense>
      )}
      {donateOpen && (
        <Suspense fallback={null}>
          <DonateDialog
            open={donateOpen}
            result={donateResult}
            onOpenChange={(open) => {
              setDonateOpen(open);
              if (!open) setDonateResult(null);
            }}
          />
        </Suspense>
      )}
    </LazyMotion>
  );
};

export default Home;
