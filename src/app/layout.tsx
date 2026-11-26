import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { MusicPlayer } from '@/features/music/music-player';
import { PageRestoreCoordinator } from '@/features/pwa/page-restore-coordinator';
import { PwaRegistration } from '@/features/pwa/pwa-registration';
import { HeadScripts } from '@/components/head-scripts';
import { SiteInteractionGuard } from '@/components/site-interaction/guard';
import { SitePreloader } from '@/components/site-preloader';
import { qqSharingMeta, siteMetadata, siteViewport, structuredData } from '@/config/seo/metadata';
import { SITE_ANALYTICS_URL, SITE_LANG } from '@/config/site';

import './globals.css';

export const metadata = siteMetadata;
export const viewport = siteViewport;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // 首帧脚本会给 iOS 主屏应用标记 class（用于状态栏补偿），
    // 该 DOM 变化发生在 hydration 前，React 会当作属性差异报警，这里仅抑制该元素的校验。
    <html lang={SITE_LANG} translate="no" suppressHydrationWarning>
      <head>
        {/* 禁止浏览器把页面自动翻译成其他语言，避免中文文案被改写 */}
        <meta name="google" content="notranslate" />
        <HeadScripts />
        <link
          rel="preconnect"
          href={SITE_ANALYTICS_URL}
        />
        {/* 新字体由 index.css 的 @font-face 按需加载，font-display: swap
            保证首屏先用回退字体绘制，不做预加载以免拖慢关键资源 */}
        {/* QQ Sharing 专用元标签（使用绝对路径更保险） */}
        <meta itemProp="name" content={qqSharingMeta.name} />
        <meta itemProp="image" content={qqSharingMeta.image} />
        <meta name="description" itemProp="description" content={qqSharingMeta.description} />
      </head>
      <body>
        <PwaRegistration>
          <PageRestoreCoordinator />
          <SitePreloader />
          <script
            id="structured-data"
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify(structuredData).replace(/</g, '\\u003c'),
            }}
          />
          {children}
          <MusicPlayer />
          <SiteInteractionGuard />
          {/* Vercel 统计只在 Vercel 部署注入：IGA 侧加载同一个脚本只会多一次无归属的境外请求。
              预览部署记为 development，避免 PR / 预览流量计入生产数据。 */}
          {process.env.VERCEL === '1' ? (
            <>
              <Analytics
                mode={process.env.VERCEL_ENV === 'production' ? 'production' : 'development'}
              />
              <SpeedInsights />
            </>
          ) : null}
        </PwaRegistration>
      </body>
    </html>
  );
}
