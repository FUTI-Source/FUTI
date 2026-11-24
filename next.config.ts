import { randomBytes } from 'node:crypto';
import type { NextConfig } from 'next';

import { SITE_CDN_CACHE } from './site.config';

// Vercel 在构建时注入 VERCEL=1；它按自己的产物模型托管 Next.js，
// standalone 输出只在火山引擎 IGA Pages（自包含 server.js）这条链路上需要。
const isVercel = process.env.VERCEL === '1';

// Next 16 默认拦截跨域 dev 请求；预览沙箱的代理域名通过 .env.local 注入，
// 避免把环境专属主机名写进仓库。
const allowedDevOrigins = (process.env.NEXT_ALLOWED_DEV_ORIGINS ?? '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

/** public/ 下的字体、启动图与 Live2D 模型构建后不再变化，交给 DCDN 长期缓存 */
const IMMUTABLE_CACHE = SITE_CDN_CACHE.immutable;
/** 可能随版本更新的静态资源，用较短缓存避免模型更新后长期命中旧文件 */
const STATIC_CACHE = SITE_CDN_CACHE.static;
/** Service Worker 必须永不缓存，否则新版本推不下去 */
const SW_CACHE = SITE_CDN_CACHE.serviceWorker;
/** 接口一律 no-store：支付回调、订单状态与 Webhook 不能被 CDN 复用 */
const API_CACHE = SITE_CDN_CACHE.api;

// 软刷新走 router.refresh()，只换 RSC 数据，不会重新加载客户端 JS bundle。
// Next.js 会在 RSC 响应里比对 buildId，不一致才降级为 MPA 导航去取新 bundle；
// 因此每次构建都要写入新的 .next/BUILD_ID（不依赖构建平台是否复用旧产物）。
// BUILD_ID 环境变量可显式指定，便于 CI 用提交号作为版本标识。
const generateBuildId = async () =>
  process.env.BUILD_ID ?? `${Date.now().toString(36)}-${randomBytes(6).toString('hex')}`;

const nextConfig: NextConfig = {
  reactStrictMode: true,
  generateBuildId,
  // 不输出浏览器 source map：避免源码经 DCDN 公开，同时减小部署产物与上传体积
  productionBrowserSourceMaps: false,
  // 部署产物依赖 framework standalone 输出（自包含 server.js）
  output: isVercel ? undefined : 'standalone',
  devIndicators: false,
  // 隐藏 X-Powered-By，减少无谓的响应头
  poweredByHeader: false,
  allowedDevOrigins,
  experimental: {
    // lucide-react 图标库按需编译，缩短构建时间并减小产物体积
    optimizePackageImports: ['lucide-react'],
  },
  images: {
    // Serve local WebP assets directly; FaaS runtimes cannot reliably persist
    // Next.js's on-demand image optimization cache.
    unoptimized: true,
    // Next.js 16 起必须显式声明用到的 quality。
    qualities: [80],
    deviceSizes: [448, 640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    remotePatterns: [],
  },
  // 裸域自动补 www 放在 src/proxy.ts：主机名需要「不带 www 就加 www」的
  // 通用判断，next.config 的 redirects 只能按写死的 host 精确匹配，换域名
  // 就得改规则。单域名分流在 DNS 层完成，这里不配置平台/地域跳转。
  async headers() {
    const isProd = process.env.NODE_ENV === 'production';

    // CSP：生产环境强制启用，开发环境用 Report-Only 避免阻断调试
    // va.vercel-scripts.com 只在 Vercel 统计的调试链路（mode=development，即预览部署）上加载脚本与上报；
    // 生产走同源 /_vercel/insights/*、/_vercel/speed-insights/*，由 'self' 覆盖。漏配不会报错，只会让统计静默归零。
    const cspHeader = {
      key: isProd ? 'Content-Security-Policy' : 'Content-Security-Policy-Report-Only',
      value: [
        "default-src 'self'",
        "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://cloud.umami.is https://va.vercel-scripts.com",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: blob:",
        "font-src 'self' data:",
        "connect-src 'self' https://cloud.umami.is wss://cloud.umami.is https://va.vercel-scripts.com",
        "worker-src 'self'",
        "manifest-src 'self'",
        "frame-ancestors 'none'",
        'base-uri \'self\'',
        'form-action \'self\'',
        isProd ? 'upgrade-insecure-requests' : '',
      ]
        .filter(Boolean)
        .join('; '),
    };

    return [
      {
        source: '/sw.js',
        headers: [
          {
            key: 'Cache-Control',
            value: SW_CACHE,
          },
        ],
      },
      {
        // 接口响应与支付回调必须实时，CDN/浏览器都不能缓存
        source: '/api/:path*',
        headers: [{ key: 'Cache-Control', value: API_CACHE }],
      },
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          cspHeader,
        ],
      },
      {
        source: '/fonts/:path*',
        headers: [{ key: 'Cache-Control', value: IMMUTABLE_CACHE }],
      },
      {
        source: '/launch/:path*',
        headers: [{ key: 'Cache-Control', value: IMMUTABLE_CACHE }],
      },
      {
        source: '/live2d/:path*',
        headers: [{ key: 'Cache-Control', value: STATIC_CACHE }],
      },
      {
        source: '/docs/:path*',
        headers: [{ key: 'Cache-Control', value: STATIC_CACHE }],
      },
    ];
  },
};

export default nextConfig;
