'use client';

import { useEffect, useState } from 'react';

import { cn } from '@/lib/utils';

/** 加载圈至少停留的时间，避免秒开时只闪一下反而显得突兀 */
const MIN_VISIBLE_MS = 600;
/** 兜底时间：字体或图片异常时不至于一直卡在加载页 */
const MAX_WAIT_MS = 10_000;
/** 与样式中的淡出时长保持一致 */
const FADE_OUT_MS = 450;

type Phase = 'loading' | 'leaving' | 'done';

/**
 * 截图/爬虫环境（部署预览图、无头浏览器）不展示加载页。
 * 这类环境通常只截首帧或等待时间很短，遮罩会让预览图永远停在加载态；
 * 脚本在 body 起始处同步执行，早于遮罩渲染，保证截图直接拿到加载后的页面。
 */
const HIDE_PRELOADER_IN_AUTOMATION_SCRIPT = `(function(){try{
var nav=window.navigator||{};
var ua=nav.userAgent||'';
if(nav.webdriver||/HeadlessChrome|Vercel-Screenshot|IGA-Screenshot/i.test(ua))document.documentElement.classList.add('preload-skip');
}catch(e){}})();`;

/**
 * 首屏加载页。
 *
 * 服务端就渲染出不透明的遮罩与加载圈，CSS/JS 到达前即可见；
 * 水合后等待 window load、字体与首屏图片解码完成，再淡出交给页面。
 * 全程不阻塞 HTML 输出，内容照常被爬虫与首屏 LCP 看到。
 */
export const SitePreloader = () => {
  const [phase, setPhase] = useState<Phase>('loading');

  useEffect(() => {
    const startedAt = performance.now();
    const timers: number[] = [];
    let finished = false;

    const reveal = () => {
      if (finished) return;
      finished = true;

      const remaining = Math.max(0, MIN_VISIBLE_MS - (performance.now() - startedAt));
      timers.push(
        window.setTimeout(() => {
          setPhase('leaving');
          timers.push(window.setTimeout(() => setPhase('done'), FADE_OUT_MS));
        }, remaining),
      );
    };

    // 不直接等 window load：它还会算上统计脚本、Service Worker 等与首屏无关的资源，
    // 慢网下会把加载页拖到兜底时间。字体与首屏图片就绪即可交还页面。
    const fontsReady = document.fonts?.ready ?? Promise.resolve();

    // 只等首屏会立即展示的图片；loading="lazy" 的交还给浏览器按需加载。
    const imagesReady = Promise.allSettled(
      Array.from(document.images)
        .filter((image) => image.loading !== 'lazy' && typeof image.decode === 'function')
        .map((image) => image.decode()),
    );

    const timedOut = new Promise<void>((resolve) => {
      timers.push(window.setTimeout(resolve, MAX_WAIT_MS));
    });

    void Promise.race([Promise.all([fontsReady, imagesReady]), timedOut]).then(reveal);

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, []);

  if (phase === 'done') return null;

  return (
    <>
      <noscript>
        {/* 脚本不可用时没有机会淡出，直接让出页面 */}
        <style>{'#site-preloader{display:none}'}</style>
      </noscript>
      {/* 自动化环境直接隐藏遮罩，并跳过入场动画，让截图拿到最终态页面；正常用户不受影响 */}
      <script dangerouslySetInnerHTML={{ __html: HIDE_PRELOADER_IN_AUTOMATION_SCRIPT }} />
      <style>
        {'html.preload-skip #site-preloader{display:none}html.preload-skip *{opacity:1!important;transform:none!important;transition:none!important;animation:none!important}'}
      </style>
      <div
        id="site-preloader"
        role="status"
        aria-live="polite"
        aria-label="页面加载中"
        className={cn(
          'fixed inset-0 z-[1000] flex flex-col items-center justify-center gap-5 bg-[#15161a] transition-opacity duration-[450ms] ease-out',
          phase === 'leaving' && 'pointer-events-none opacity-0',
        )}
      >
        {/* 加载圈是功能性的进度反馈，不随 reduced-motion 停转；冻结的圈会让人以为卡住了 */}
        <svg
          className="size-12 animate-spin"
          viewBox="0 0 50 50"
          aria-hidden="true"
        >
          <circle cx="25" cy="25" r="20" fill="none" strokeWidth="2.5" className="stroke-white/10" />
          <circle
            cx="25"
            cy="25"
            r="20"
            fill="none"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeDasharray="30 96"
            className="stroke-brand"
          />
        </svg>
        <span className="sr-only">正在加载</span>
      </div>
    </>
  );
};
