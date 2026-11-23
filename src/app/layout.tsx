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
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{
var root=document.documentElement;
var nav=window.navigator;
var ios=/iPad|iPhone|iPod/.test(nav.userAgent)||(nav.platform==='MacIntel'&&nav.maxTouchPoints>1);
var standalone=window.matchMedia('(display-mode: standalone)').matches||window.matchMedia('(display-mode: fullscreen)').matches||nav.standalone===true;
var homeScreen=ios&&standalone;
if(homeScreen)root.classList.add('ios-standalone');
var lastWidth=0,lastHeight=0;
var update=function(){
var w=window.innerWidth||0;
var inner=window.innerHeight||0;
var vv=window.visualViewport;
var h=inner;
if(vv&&vv.height>h)h=vv.height;
if(homeScreen){
/* 冷启动时 innerHeight 仍是带 Safari 工具栏的高度，屏幕高度更接近整屏 */
var screenHeight=window.screen.height;
if(screenHeight>h&&screenHeight-h<=200)h=screenHeight;
}
if(!w||!h)return;
/* 宽度不变的高度收缩来自键盘等临时状态，忽略以免整页抖动 */
if(h<lastHeight&&w===lastWidth)return;
if(h===lastHeight&&w===lastWidth)return;
lastWidth=w;lastHeight=h;
root.style.setProperty('--app-height',h+'px');
};
update();
window.addEventListener('resize',update);
window.addEventListener('orientationchange',update);
window.addEventListener('pageshow',update);
if(window.visualViewport)window.visualViewport.addEventListener('resize',update);
document.addEventListener('visibilitychange',function(){if(!document.hidden)update()});
}catch(e){console.error(e)}})();`,
          }}
        />
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
