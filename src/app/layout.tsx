import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { MusicPlayer } from '@/features/music/music-player';
import { PageRestoreCoordinator } from '@/features/pwa/page-restore-coordinator';
import { PwaRegistration } from '@/features/pwa/pwa-registration';
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
        {/* 内核语法能力检测：360 等浏览器会伪造高版本 Chrome UA，服务端按 UA 放行后
            旧内核解析 ES2022 产物会抛 SyntaxError 导致页面白屏，
            这里在一切脚本之前实测语法能力，不达标立即跳转到版本过低页 */}
        {/* eslint-disable-next-line @next/next/no-sync-scripts --
            必须同步：不达标浏览器应在新语法代码执行前被重定向 */}
        <script src="/scripts/browser-check.js" />
        {/* 性能条目兼容层：过滤 Firefox 不支持的 layout-shift 等条目类型，
            消除第三方统计脚本（Umami Web Vitals）的控制台噪音。
            不改变支持的浏览器里的采集结果，也不影响布局。
            用 defer 即可：统计脚本都在 hydration 之后才注入，晚于本脚本执行。 */}
        <script src="/scripts/perf-observer-guard.js" defer />
        {/* 视口稳定性：实测 --app-height 并同步 html min-height，修复 iOS 主屏 PWA
            底部黑边；同时标记 ios-standalone。实测值会等样式表就绪后再写入，
            避免在解析期强制排版（Firefox 会因此报无样式内容闪烁）。 */}
        {/* eslint-disable-next-line @next/next/no-sync-scripts --
            必须同步：ios-standalone class 要在首帧绘制前就位，避免状态栏补偿闪一下 */}
        <script src="/scripts/app-height.js" />
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
