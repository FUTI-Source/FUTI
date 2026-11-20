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

// iOS 启动图按设备逻辑尺寸 + 像素比精确匹配，未命中会显示空白背景。
const APPLE_SPLASH_SCREENS = [
  [320, 568, 2],
  [375, 667, 2],
  [414, 736, 3],
  [375, 812, 3],
  [414, 896, 2],
  [390, 844, 3],
  [393, 852, 3],
  [402, 874, 3],
  [414, 896, 3],
  [428, 926, 3],
  [430, 932, 3],
  [440, 956, 3],
  [768, 1024, 1],
  [768, 1024, 2],
  [834, 1112, 2],
  [834, 1194, 2],
  [1024, 1366, 2],
  [820, 1180, 2],
  [744, 1133, 2],
  [1024, 768, 1],
  [1024, 768, 2],
  [1112, 834, 2],
  [1194, 834, 2],
  [1366, 1024, 2],
  [1180, 820, 2],
  [1133, 744, 2],
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
    startupImage: APPLE_SPLASH_SCREENS.map(([width, height, ratio]) => ({
      url: `/launch/splash-${width * ratio}x${height * ratio}.png`,
      media: `(device-width: ${width}px) and (device-height: ${height}px) and (-webkit-device-pixel-ratio: ${ratio})`,
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