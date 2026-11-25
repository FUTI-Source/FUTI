import { SITE_ANALYTICS_URL } from './analytics';
import { SITE_IMAGE_PATH } from './seo';

/**
 * PWA / Service Worker 配置：路径、主题色、注册行为、生命周期与 SW CSP 白名单。
 * SW 源码由 esbuild 单独编译，只能通过相对路径引用本文件。
 */
export const SITE_PWA = {
  /** manifest 的 theme_color / background_color */
  themeColor: '#15161a',
  /** Safari 顶部工具栏着色 */
  browserThemeColor: '#1d1e20',

  icons: [
    { src: SITE_IMAGE_PATH, sizes: '192x192', type: 'image/png', purpose: 'any' },
    { src: '/icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
  ],
  screenshots: [
    { src: '/screenshot-desktop.png', sizes: '1280x627', type: 'image/png', formFactor: 'wide' },
    { src: '/screenshot-mobile.png', sizes: '390x751', type: 'image/png', formFactor: 'narrow' },
  ],

  /** SW 源码路径（相对仓库根目录）与对外脚本地址 */
  swSrc: 'src/app/sw.ts',
  swUrl: '/serwist/sw.js',
  scope: '/',
  /** 文档请求离线且无缓存时的兜底页 */
  offlineUrl: '/offline-fallback',
  /** 迁移期要注销的旧 SW 路径与旧手写缓存前缀 */
  legacySwPath: '/sw.js',
  legacyCachePrefix: 'site-',

  /** 注册行为：关闭自动 reload/history 改写，避免后台恢复时白屏 */
  updateViaCache: 'none' as const,
  cacheOnNavigation: false,
  reloadOnOnline: false,

  /** SW 生命周期与缓存边界 */
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  apiPrefix: '/api/',

  /** SW 内部 fetch 放行的跨域来源，next.config.ts 据此生成 connect-src */
  connectOrigins: [
    SITE_ANALYTICS_URL,
    'wss://cloud.umami.is',
    'https://va.vercel-scripts.com',
    'https://*.paypal.com',
    'https://music.126.net',
    'https://*.music.126.net',
  ],
} as const;
