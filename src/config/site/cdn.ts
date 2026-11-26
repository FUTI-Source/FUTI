/**
 * 静态资源缓存策略，由 next.config.ts 写入响应头。
 *
 * 架构：Vercel 是唯一源站；境内访客经 DNS 中国内地线路进入火山引擎 DCDN，
 * 再由 DCDN 回源 Vercel。境外访客直连 Vercel。
 *
 * 注意 Vercel 的头处理：响应里只有 Cache-Control 时，Vercel 会消费并剥掉
 * s-maxage / stale-*，DCDN 回源拿到的只剩浏览器那部分。因此可缓存的档位
 * 同时写 CDN-Cache-Control：Vercel 见到它后会把 Cache-Control 原样透传，
 * 下游 DCDN 跟随源站时就能读到完整的 s-maxage / stale-* 指令。
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

/**
 * 火山引擎 DCDN 回源约定。DCDN 控制台「回源 HTTP 请求头」需要配置：
 *  - clientIpHeader = ${client_ip}（DCDN 内置变量，访客真实 IP）
 *  - authHeader     = 与 Vercel 环境变量 DCDN_ORIGIN_SECRET 相同的随机串
 *
 * 回源后 Vercel 看到的对端是 DCDN 节点，x-forwarded-for / x-real-ip 都是节点 IP；
 * 只有携带正确 authHeader 的请求才信任 clientIpHeader，绕过 DCDN 直连 Vercel
 * 的请求无法伪造访客 IP。
 */
export const SITE_DCDN_ORIGIN = {
  clientIpHeader: 'x-dcdn-client-ip',
  authHeader: 'x-dcdn-origin-auth',
} as const;
