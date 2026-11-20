import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';

import { ServiceWorkerRegistration } from '@/features/pwa/service-worker-registration';
import { SiteInteractionGuard } from '@/components/site-interaction-guard';
import { SITE_URL } from '@/lib/site';

import './globals.css';

const geometos = localFont({
  src: '../../public/fonts/Geometos.woff',
  display: 'swap',
  variable: '--font-geometos',
  preload: true,
});

// 公共常量配置（建议图片使用带域名的绝对路径，以确保微信/QQ抓取成功）
const SITE_NAME = 'FUTI · 个人主页';
const SITE_DESCRIPTION = 'FUTI（张文涛）的个人主页，分享全栈开发、开源项目与技术实践。';
const SITE_ICON_PATH = '/favicon.ico';

// iOS 主屏图标必须是 PNG 且不透明，.ico 会被系统忽略。
const APPLE_TOUCH_ICONS = [180, 167, 152, 120].map((size) => ({
  url: `/apple-touch-icon-${size}x${size}.png`,
  sizes: `${size}x${size}`,
  type: 'image/png',
}));

// iOS 26/27 会把启动图 media 里的 device-height 误判为 Safari 当时的可见视口高度，
// 精确的宽高匹配会全部落空（WebKit #326500）；改为只按 device-width + 像素比匹配。
// 1024@2 同时对应 12.9" iPad 竖屏与 10.2" iPad 横屏，需用 orientation 区分。
const APPLE_SPLASH_SCREENS = [
  { width: 320, height: 568, ratio: 2 },
  { width: 375, height: 667, ratio: 2 },
  { width: 375, height: 812, ratio: 3 },
  { width: 390, height: 844, ratio: 3 },
  { width: 393, height: 852, ratio: 3 },
  { width: 402, height: 874, ratio: 3 },
  { width: 414, height: 896, ratio: 2 },
  { width: 414, height: 896, ratio: 3 },
  { width: 428, height: 926, ratio: 3 },
  { width: 430, height: 932, ratio: 3 },
  { width: 440, height: 956, ratio: 3 },
  { width: 768, height: 1024, ratio: 1 },
  { width: 768, height: 1024, ratio: 2 },
  { width: 820, height: 1180, ratio: 2 },
  { width: 834, height: 1194, ratio: 2 },
  { width: 1024, height: 1366, ratio: 2, orientation: 'portrait' },
  { width: 1024, height: 768, ratio: 2, orientation: 'landscape' },
  { width: 744, height: 1133, ratio: 2 },
  { width: 1112, height: 834, ratio: 2 },
  { width: 1133, height: 744, ratio: 2 },
  { width: 1180, height: 820, ratio: 2 },
  { width: 1194, height: 834, ratio: 2 },
  { width: 1366, height: 1024, ratio: 2 },
] as const;
const SITE_IMAGE_PATH = '/icon-192.png';
const SITE_IMAGE_URL = `${SITE_URL}${SITE_IMAGE_PATH}`;
const SOCIAL_IMAGE_PATH = '/og-image.png';
const SOCIAL_IMAGE_URL = `${SITE_URL}${SOCIAL_IMAGE_PATH}`;

const structuredData = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebSite',
      '@id': `${SITE_URL}/#website`,
      url: SITE_URL,
      name: SITE_NAME,
      inLanguage: 'zh-CN',
      about: { '@id': `${SITE_URL}/#person` },
      publisher: { '@id': `${SITE_URL}/#person` },
    },
    {
      '@type': 'Person',
      '@id': `${SITE_URL}/#person`,
      name: '张文涛',
      alternateName: 'FUTI',
      url: SITE_URL,
      image: SOCIAL_IMAGE_URL,
      description: SITE_DESCRIPTION,
      jobTitle: '全栈开发者',
      knowsAbout: ['全栈开发', '开源项目', 'Web 开发'],
      sameAs: [],
    },
  ],
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  applicationName: 'FUTI',
  title: {
    default: SITE_NAME,
    template: '%s | FUTI',
  },
  description: SITE_DESCRIPTION,
  authors: [{ name: 'FUTI', url: SITE_URL }],
  creator: 'FUTI',
  publisher: 'FUTI',
  alternates: {
    canonical: '/',
  },
  icons: {
    icon: [
      { url: SITE_ICON_PATH },
    ],
    apple: APPLE_TOUCH_ICONS,
  },
  manifest: '/manifest.webmanifest',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'zh_CN',
    url: SITE_URL,
    siteName: SITE_NAME,
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    images: [
      {
        url: SOCIAL_IMAGE_URL,
        width: 1200,
        height: 630,
        alt: `${SITE_NAME} 封面图`,
        type: 'image/png',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    images: [SOCIAL_IMAGE_URL],
  },
  appleWebApp: {
    capable: true,
    title: 'FUTI',
    statusBarStyle: 'black-translucent',
    startupImage: APPLE_SPLASH_SCREENS.map(({ width, height, ratio, ...screen }) => ({
      url: `/launch/splash-${width * ratio}x${height * ratio}.png`,
      media: [
        'orientation' in screen ? `(orientation: ${screen.orientation})` : null,
        `(device-width: ${width}px)`,
        `(-webkit-device-pixel-ratio: ${ratio})`,
      ]
        .filter(Boolean)
        .join(' and '),
    })),
  },
  other: {
    // iOS 18 起采用标准属性，旧版系统仍读取 apple- 前缀。
    'apple-mobile-web-app-capable': 'yes',
    'format-detection': 'telephone=no',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  colorScheme: 'dark',
  themeColor: '#15161a',
};

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

        {/* WeChat Sharing 专用全局变量 */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              var WECHAT_TITLE = ${JSON.stringify(SITE_NAME)};
              var WECHAT_DESC = ${JSON.stringify(SITE_DESCRIPTION)};
              var WECHAT_IMAGE = ${JSON.stringify(SITE_IMAGE_URL)};
              var WCHAT_NO_GA = '';
            `,
          }}
        />
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