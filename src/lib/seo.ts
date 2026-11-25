import type { Metadata, Viewport } from 'next';

import {
  SITE_AUTHOR_NAME,
  SITE_DESCRIPTION,
  SITE_ICON_PATH,
  SITE_IMAGE_PATH,
  SITE_JOB_TITLE,
  SITE_KEYWORDS,
  SITE_KNOWS_ABOUT,
  SITE_LANG,
  SITE_LOCALE,
  SITE_NAME,
  SITE_PWA,
  SITE_SOCIAL_IMAGE,
  SITE_SOCIAL_LINKS,
  SITE_TWITTER_HANDLE,
  SITE_URL,
} from '~/site.config';

/** 分享卡片图，1200×630，各平台（微信/QQ/Twitter）通用 */
const SOCIAL_IMAGE = {
  ...SITE_SOCIAL_IMAGE,
  alt: `${SITE_NAME} 封面图`,
} as const;

const SITE_IMAGE_URL = `${SITE_URL}${SITE_IMAGE_PATH}`;

/**
 * QQ 分享抓取用的 Microdata 标记。
 * OG 标签是主流平台的首选，但 QQ/QQ 空间的旧抓取链路仍会读 itemprop，保留作为兜底。
 */
export const qqSharingMeta = {
  name: SITE_NAME,
  image: SITE_IMAGE_URL,
  description: SITE_DESCRIPTION,
};

// iOS 主屏图标必须是 PNG 且不透明，.ico 会被系统忽略。
// 默认路径 apple-touch-icon.png 供不读取 link 标签的抓取服务兜底。
const APPLE_TOUCH_ICONS = [
  { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
  ...[167, 152, 120].map((size) => ({
    url: `/apple-touch-icon-${size}x${size}.png`,
    sizes: `${size}x${size}`,
    type: 'image/png',
  })),
];

// iOS 26/27 会把启动图 media 里的 device-height 误判为 Safari 当时的可见视口高度，
// 精确的宽高匹配会全部落空（WebKit #326500）；改为只按 device-width + 像素比匹配。
// 1024@2 同时对应 12.9" iPad 竖屏与 10.2" iPad 横屏，需用 orientation 区分。
const APPLE_SPLASH_SCREENS = [
  { width: 320, height: 568, ratio: 2 },
  { width: 360, height: 780, ratio: 3 },
  { width: 375, height: 667, ratio: 2 },
  { width: 375, height: 812, ratio: 3 },
  { width: 390, height: 844, ratio: 3 },
  { width: 393, height: 852, ratio: 3 },
  { width: 402, height: 874, ratio: 3 },
  { width: 414, height: 896, ratio: 2 },
  { width: 414, height: 896, ratio: 3 },
  { width: 420, height: 912, ratio: 3 },
  { width: 428, height: 926, ratio: 3 },
  { width: 430, height: 932, ratio: 3 },
  { width: 440, height: 956, ratio: 3 },
  { width: 768, height: 1024, ratio: 1 },
  { width: 768, height: 1024, ratio: 2 },
  { width: 810, height: 1080, ratio: 2 },
  { width: 820, height: 1180, ratio: 2 },
  { width: 834, height: 1194, ratio: 2 },
  { width: 834, height: 1210, ratio: 2 },
  { width: 1024, height: 1366, ratio: 2, orientation: 'portrait' },
  { width: 1032, height: 1376, ratio: 2 },
  { width: 1024, height: 768, ratio: 2, orientation: 'landscape' },
  // iPhone Duo：内屏 1878×2670（626×890@3），外屏 1398×2034（466×678@3）
  { width: 626, height: 890, ratio: 3 },
  { width: 890, height: 626, ratio: 3 },
  { width: 466, height: 678, ratio: 3 },
  { width: 678, height: 466, ratio: 3 },
  { width: 744, height: 1133, ratio: 2 },
  { width: 1080, height: 810, ratio: 2 },
  { width: 1112, height: 834, ratio: 2 },
  { width: 1133, height: 744, ratio: 2 },
  { width: 1180, height: 820, ratio: 2 },
  { width: 1194, height: 834, ratio: 2 },
  { width: 1210, height: 834, ratio: 2 },
  { width: 1366, height: 1024, ratio: 2 },
  { width: 1376, height: 1032, ratio: 2 },
] as const;

export const structuredData = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebSite',
      '@id': `${SITE_URL}/#website`,
      url: SITE_URL,
      name: SITE_NAME,
      inLanguage: SITE_LANG,
      about: { '@id': `${SITE_URL}/#person` },
      publisher: { '@id': `${SITE_URL}/#person` },
    },
    {
      '@type': 'Person',
      '@id': `${SITE_URL}/#person`,
      name: SITE_AUTHOR_NAME,
      url: SITE_URL,
      image: SITE_IMAGE_URL,
      description: SITE_DESCRIPTION,
      jobTitle: SITE_JOB_TITLE,
      knowsAbout: [...SITE_KNOWS_ABOUT],
      sameAs: Object.values(SITE_SOCIAL_LINKS).filter(Boolean),
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

const twitterHandle = SITE_TWITTER_HANDLE ? `@${SITE_TWITTER_HANDLE}` : undefined;

export const siteMetadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  applicationName: SITE_AUTHOR_NAME,
  title: {
    default: SITE_NAME,
    template: `%s | ${SITE_AUTHOR_NAME}`,
  },
  description: SITE_DESCRIPTION,
  keywords: [...SITE_KEYWORDS],
  authors: [{ name: SITE_AUTHOR_NAME, url: SITE_URL }],
  creator: SITE_AUTHOR_NAME,
  publisher: SITE_AUTHOR_NAME,
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
    locale: SITE_LOCALE,
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
    ...(twitterHandle ? { site: twitterHandle, creator: twitterHandle } : {}),
  },
  appleWebApp: {
    capable: true,
    title: SITE_AUTHOR_NAME,
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
  // 布局视口铺满屏幕（含圆角、刘海与底部指示条），env(safe-area-inset-*) 才有值；
  // 未设置时 Safari 会自行内缩，安全区恒为 0，满屏背景会出现留白。
  // 内容侧需用 --safe-top / --safe-bottom 避让，见 src/styles/index.css。
  viewportFit: 'cover',
  colorScheme: 'dark',
  // 与壁纸顶部实测色调一致，让 Safari 顶部工具栏着色融入页面背景
  themeColor: SITE_PWA.browserThemeColor,
};
