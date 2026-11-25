/**
 * 静态资源缓存策略，由 next.config.ts 写入响应头，交给 CDN / Vercel Edge 缓存。
 * 缓存头只按路径设置，在共用同一域名的两条部署链路上表现一致。
 */
export const SITE_CDN_CACHE = {
  immutable: 'public, max-age=31536000, s-maxage=31536000, immutable',
  static:
    'public, max-age=604800, s-maxage=604800, stale-while-revalidate=86400, stale-if-error=604800',
  /** Service Worker 永不缓存；no-transform 防止 CDN 改写脚本 */
  serviceWorker: 'no-cache, no-store, must-revalidate, no-transform',
  /** 支付回调、订单状态与 Webhook 不允许被共享缓存复用 */
  api: 'no-store, no-cache, must-revalidate, private',
} as const;
