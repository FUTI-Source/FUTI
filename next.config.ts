import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  productionBrowserSourceMaps: true,
  experimental: {
    inlineCss: true,
  },
  webpack(config, { isServer }) {
    if (!isServer) {
      // These shims target legacy browsers excluded by the configured Browserslist.
      config.resolve.alias = {
        ...config.resolve.alias,
        '../build/polyfills/polyfill-module$': false,
        '@pixi/polyfill': false,
      };
    }

    return config;
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
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
