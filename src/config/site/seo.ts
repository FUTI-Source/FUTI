/** SEO 与分享图资源路径。 */

/** Twitter/X 账号，不含 @。留空则不输出 twitter:site / twitter:creator */
export const SITE_TWITTER_HANDLE = '';

/** 站点图标（favicon，文件在 public/ 下） */
export const SITE_ICON_PATH = '/favicon.ico';
/** 192×192 图标，同时作为 PWA 最小图标 */
export const SITE_IMAGE_PATH = '/icon-192x192.png';

/** 分享卡片主图：1200×630，微信 / QQ / Twitter / Telegram 通用 */
export const SITE_SOCIAL_IMAGE = {
  path: '/og-image.png',
  width: 1200,
  height: 630,
  type: 'image/png',
} as const;

/** iOS 主屏图标必须是 PNG 且不透明；默认项供不读取 link 标签的抓取服务兜底 */
export const SITE_APPLE_TOUCH_ICONS = [
  { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
  ...[167, 152, 120].map((size) => ({
    url: `/apple-touch-icon-${size}x${size}.png`,
    sizes: `${size}x${size}`,
    type: 'image/png',
  })),
];

/**
 * iOS 启动图尺寸表。iOS 26/27 会把 device-height 误判为 Safari 可见视口高度，
 * 因此只按 device-width + 像素比匹配；1024@2 需用 orientation 区分两种设备。
 */
export const SITE_APPLE_SPLASH_SCREENS = [
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
