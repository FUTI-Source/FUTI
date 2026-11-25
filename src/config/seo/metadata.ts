import type { Metadata, Viewport } from 'next';

import {
  SITE_APPLE_SPLASH_SCREENS,
  SITE_APPLE_TOUCH_ICONS,
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
} from '@/config/site';

/** 分享卡片图，1200×630，各平台通用 */
const socialImageBase = {
  ...SITE_SOCIAL_IMAGE,
  alt: `${SITE_NAME} 封面图`,
} as const;

const siteImageUrl = `${SITE_URL}${SITE_IMAGE_PATH}`;

/**
 * QQ 分享抓取用的 Microdata 标记。
 * OG 标签是主流平台首选，但 QQ/QQ 空间旧抓取链路仍会读 itemprop，保留兜底。
 */
export const qqSharingMeta = {
  name: SITE_NAME,
  image: siteImageUrl,
  description: SITE_DESCRIPTION,
};

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
      image: siteImageUrl,
      description: SITE_DESCRIPTION,
      jobTitle: SITE_JOB_TITLE,
      knowsAbout: [...SITE_KNOWS_ABOUT],
      sameAs: Object.values(SITE_SOCIAL_LINKS).filter(Boolean),
    },
  ],
};

const socialImage = {
  url: `${SITE_URL}${socialImageBase.path}`,
  width: socialImageBase.width,
  height: socialImageBase.height,
  alt: socialImageBase.alt,
  type: socialImageBase.type,
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
    apple: SITE_APPLE_TOUCH_ICONS,
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
    startupImage: SITE_APPLE_SPLASH_SCREENS.map(({ width, height, ratio, ...screen }) => ({
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
  // 布局视口铺满屏幕，env(safe-area-inset-*) 才有值；见 src/styles/index.css。
  viewportFit: 'cover',
  colorScheme: 'dark',
  themeColor: SITE_PWA.browserThemeColor,
};
