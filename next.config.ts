import type { NextConfig } from 'next';

// Next 16 默认拦截跨域 dev 请求；预览沙箱的代理域名通过 .env.local 注入，
// 避免把环境专属主机名写进仓库。
const allowedDevOrigins = (process.env.NEXT_ALLOWED_DEV_ORIGINS ?? '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const nextConfig: NextConfig = {
  reactStrictMode: true,
  productionBrowserSourceMaps: true,
  devIndicators: false,
  allowedDevOrigins,
  images: {
    // Serve local AVIF assets directly; FaaS runtimes cannot reliably persist
    // Next.js's on-demand image optimization cache.
    unoptimized: true,
    // Next.js 16 起必须显式声明用到的 quality。
    qualities: [80],
    deviceSizes: [448, 640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    remotePatterns: [],
  },
  async headers() {
    return [
      {
        source: '/sw.js',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
