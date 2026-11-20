import localFont from 'next/font/local';

import { ServiceWorkerRegistration } from '@/features/pwa/service-worker-registration';
import { SiteInteractionGuard } from '@/components/site-interaction-guard';
import { SITE_DESCRIPTION, SITE_IMAGE_URL, SITE_NAME, siteMetadata, siteViewport, structuredData } from '@/lib/seo';

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
    <html lang="zh-CN">
      <head>
        {/* iOS 主屏应用冷启动时视口高度先按浏览器 UI 计算，首帧前校正为整屏高度 */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{
var nav=window.navigator;
var ios=/iPad|iPhone|iPod/.test(nav.userAgent)||(nav.platform==='MacIntel'&&nav.maxTouchPoints>1);
var standalone=window.matchMedia('(display-mode: standalone)').matches||window.matchMedia('(display-mode: fullscreen)').matches||nav.standalone===true;
if(!ios||!standalone)return;
document.documentElement.classList.add('ios-standalone');
var lastWidth=0,lastHeight=0;
var update=function(){
var w=window.innerWidth,h=window.innerHeight,screenHeight=window.screen.height;
/* 冷启动时 innerHeight 仍是带 Safari 工具栏的高度，屏幕高度更接近整屏 */
if(screenHeight>h&&screenHeight-h<=200)h=screenHeight;
/* 宽度不变的高度收缩来自键盘等临时状态，忽略以免整页抖动 */
if(h<lastHeight&&w===lastWidth)return;
lastWidth=w;lastHeight=h;
document.documentElement.style.setProperty('--app-height',h+'px');
};
update();
window.addEventListener('resize',update);
window.addEventListener('orientationchange',update);
window.addEventListener('pageshow',update);
document.addEventListener('visibilitychange',function(){if(!document.hidden)update()});
}catch(e){}})();`,
          }}
        />
        <link
          rel="preconnect"
          href="https://umami.zhang-wentao.tech"
        />
        <link
          rel="preload"
          href="/fonts/Kanit-300.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        <link
          rel="preload"
          href="/fonts/Kanit-400.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        <link
          rel="preload"
          href="/fonts/Ubuntu.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        {/* QQ Sharing 专用元标签（使用绝对路径更保险） */}
        <meta itemProp="name" content={SITE_NAME} />
        <meta itemProp="image" content={SITE_IMAGE_URL} />
        <meta name="description" itemProp="description" content={SITE_DESCRIPTION} />
      </head>
      <body className={geometos.variable}>
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
