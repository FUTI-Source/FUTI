import type { Metadata } from 'next';

import { SITE_BROWSER_MINIMUMS, SITE_NAME } from '~/site.config';

export const metadata: Metadata = {
  title: `浏览器版本过低 | ${SITE_NAME}`,
  description: '您当前的浏览器版本过低，无法正常访问本站，请升级浏览器后重试。',
  robots: { index: false, follow: false },
};

/** 推荐升级的浏览器下载入口 */
const BROWSERS = [
  {
    name: 'Microsoft Edge',
    note: 'Windows / macOS 均可使用',
    href: 'https://www.microsoft.com/zh-cn/edge/download',
  },
  {
    name: 'Google Chrome',
    note: 'Chromium 内核，功能最完整',
    href: 'https://www.google.com/chrome/',
  },
  {
    name: 'Firefox',
    note: '独立内核，轻量安全',
    href: 'https://www.mozilla.org/zh-CN/firefox/',
  },
] as const;

const MINIMUM_TEXT = [
  `Chrome / Edge ≥ ${SITE_BROWSER_MINIMUMS.chrome}`,
  `Firefox ≥ ${SITE_BROWSER_MINIMUMS.firefox}`,
  `Safari ≥ ${SITE_BROWSER_MINIMUMS.safari}`,
].join('　·　');

export default function BrowserUnsupportedPage() {
  return (
    <div className="flex-center min-h-dvh flex-col gap-6 bg-[#15161a] px-6 py-10 text-center text-white">
      {/* 被重定向来的浏览器内核过旧，大概率无法 hydrate：
          SitePreloader 的淡出依赖客户端 JS，这里直接用服务端渲染的样式隐藏它，
          保证旧浏览器第一时间看到内容，不经历加载圈与 12s CSS 兜底 */}
      <style>{'#site-preloader{display:none!important}'}</style>

      <svg
        className="size-14 text-[#0295e5]"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="10" />
        <path d="M2.5 9.5h19M2.5 14.5h19" />
        <path d="M12 2.5c2.7 2.5 4 6 4 9.5s-1.3 7-4 9.5c-2.7-2.5-4-6-4-9.5s1.3-7 4-9.5Z" />
      </svg>

      <div className="flex flex-col gap-3">
        <h1 className="font-playful text-4xl tracking-wide text-white/90 sm:text-5xl">
          浏览器版本过低
        </h1>
        <p className="max-w-md text-sm leading-6 text-white/60">
          您当前使用的浏览器版本过低，无法正常展示本站内容。
          请升级到以下版本，或更换现代浏览器后重新访问。
        </p>
      </div>

      <p className="rounded-lg bg-white/5 px-5 py-2.5 text-xs text-white/50">
        支持的最低版本：{MINIMUM_TEXT}
      </p>

      <div className="flex w-full max-w-xl flex-col gap-3 sm:flex-row sm:justify-center">
        {BROWSERS.map((browser) => (
          <a
            key={browser.name}
            href={browser.href}
            target="_blank"
            rel="noopener noreferrer"
            className="group rounded-lg border border-white/10 bg-white/5 px-5 py-4 transition-colors hover:border-[#0295e5]/60 hover:bg-[#0295e5]/10 sm:flex-1"
          >
            <div className="text-sm font-bold text-white/90 group-hover:text-[#4db8f0]">
              {browser.name}
            </div>
            <div className="mt-1 text-xs text-white/50">{browser.note}</div>
          </a>
        ))}
      </div>
    </div>
  );
}
