import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';

import { ServiceWorkerRegistration } from '@/components/pwa/service-worker-registration';
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
    apple: SITE_ICON_PATH,
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
    statusBarStyle: 'black',
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