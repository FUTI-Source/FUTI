import type { Metadata, Viewport } from 'next';

import { SITE_URL } from '@/lib/site';

export const SITE_NAME = 'FUTI · 个人主页';
export const SITE_DESCRIPTION = 'FUTI（张文涛）的个人主页，分享全栈开发、开源项目与技术实践。';

const SITE_ICON_PATH = '/favicon.ico';
const SITE_IMAGE_PATH = '/icon-192.png';

/** 分享卡片图，1200×630，各平台（微信/QQ/Twitter）通用 */
const SOCIAL_IMAGE = {
  path: '/og-image.png',
  width: 1200,
  height: 630,
  alt: `${SITE_NAME} 封面图`,
  type: 'image/png',
} as const;

export const SITE_IMAGE_URL = `${SITE_URL}${SITE_IMAGE_PATH}`;

/**
 * QQ 分享抓取用的 Microdata 标记。
 * OG 标签是主流平台的首选，但 QQ/QQ 空间的旧抓取链路仍会读 itemprop，保留作为兜底。
 */
export const qqSharingMeta = {
  name: SITE_NAME,
  image: SITE_IMAGE_URL,
  description: SITE_DESCRIPTION,
};

/**
 * 微信分享兼容变量。
 * 旧版微信分享脚本会读取这几个全局变量后再决定分享卡片的标题、描述与图片，
 * 因此在首屏同步声明，保持其可直接使用。
 */
export const wechatSharingVars = [
  `var WECHAT_TITLE = ${JSON.stringify(SITE_NAME)};`,
  `var WECHAT_DESC = ${JSON.stringify(SITE_DESCRIPTION)};`,
  `var WECHAT_IMAGE = ${JSON.stringify(SITE_IMAGE_URL)};`,
  `var WCHAT_NO_GA = '';`,
].join('\n');

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

export const structuredData = {
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
      image: SITE_IMAGE_URL,
      description: SITE_DESCRIPTION,
      jobTitle: '全栈开发者',
      knowsAbout: ['全栈开发', '开源项目', 'Web 开发'],
      sameAs: [],
    },
  ],
};

const socialImage = {
  url: `${SITE_URL}${SOCIAL_IMAGE.path}`,
  width: SOCIAL_IMAGE.width,
  height: SOCIAL_IMAGE.height,
  alt: SOCIAL_IMAGE.alt,
  type: SOCIAL_IMAGE.type,
};

export const siteMetadata: Metadata = {
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
    icon: [{ url: SITE_ICON_PATH }],
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
    images: [socialImage],
  },
  twitter: {
    card: 'summary_large_image',
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    images: [socialImage.url],
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

export const siteViewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  colorScheme: 'dark',
  // 与壁纸顶部实测色调一致，让 Safari 顶部工具栏着色融入页面背景
  themeColor: '#1d1e20',
};
