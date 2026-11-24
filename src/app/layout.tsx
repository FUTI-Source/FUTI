import localFont from 'next/font/local';

import { ServiceWorkerRegistration } from '@/features/pwa/service-worker-registration';
import { SiteInteractionGuard } from '@/components/site-interaction-guard';
import { SitePreloader } from '@/components/site-preloader';
import { qqSharingMeta, siteMetadata, siteViewport, structuredData } from '@/lib/seo';
import { SITE_ANALYTICS_URL, SITE_LANG } from '@/lib/site';

import './globals.css';

const geometos = localFont({
  src: '../../public/fonts/Geometos.woff',
  display: 'swap',
  variable: '--font-geometos',
  preload: true,
});

export const metadata = siteMetadata;
export const viewport = siteViewport;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // 首帧脚本会在 hydration 前给 <html> 写入 --app-height，
    // React 会把它当成属性差异报警，这里只抑制该元素自身的属性校验。
    <html lang={SITE_LANG} translate="no" suppressHydrationWarning>
      <head>
        {/* 禁止浏览器把页面自动翻译成其他语言，避免中文文案被改写 */}
        <meta name="google" content="notranslate" />
        {/* 首帧前用真实视口高度校正 --app-height：
            1. iOS 主屏应用冷启动时 innerHeight 仍是带 Safari 工具栏的高度；
            2. Safari/iPadOS 横屏时 dvh 会少算工具栏高度，导致页面底部留白，
               这里取 innerHeight 与 visualViewport.height 的较大值，保证铺满画布。 */}
        <script src="/scripts/app-height.js" />
        <link
          rel="preconnect"
          href={SITE_ANALYTICS_URL}
        />
        {/* Kanit/Ubuntu 只用于首屏外或延迟淡入的文字，预加载反而会触发
            “preloaded but not used” 警告；交给 @font-face 按需加载即可 */}
        {/* QQ Sharing 专用元标签（使用绝对路径更保险） */}
        <meta itemProp="name" content={qqSharingMeta.name} />
        <meta itemProp="image" content={qqSharingMeta.image} />
        <meta name="description" itemProp="description" content={qqSharingMeta.description} />
      </head>
      <body className={geometos.variable}>
        <SitePreloader />
        <script
          id="structured-data"
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(structuredData).replace(/</g, '\\u003c'),
          }}
        />
        {children}
        <ServiceWorkerRegistration />
        <SiteInteractionGuard />
      </body>
    </html>
  );
}
