import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  productionBrowserSourceMaps: true,
  experimental: {
    inlineCss: true,
  },
  webpack(config, { dev, isServer }) {
    if (!dev && !isServer) {
      // This project only supports modern browsers; remove Next.js's legacy
      // nomodule bundle and its manifest references.
      config.plugins.push({
        apply(compiler: any) {
          compiler.hooks.thisCompilation.tap('RemoveLegacyPolyfills', (compilation: any) => {
            compilation.hooks.processAssets.tap(
              {
                name: 'RemoveLegacyPolyfills',
                stage: compiler.webpack.Compilation.PROCESS_ASSETS_STAGE_REPORT,
              },
              () => {
                for (const asset of compilation.getAssets()) {
                  if (asset.name.startsWith('static/chunks/polyfills-')) {
                    compilation.deleteAsset(asset.name);
                  }
                }

                const manifest = compilation.getAsset('build-manifest.json');
                if (manifest) {
                  const content = JSON.parse(manifest.source.source().toString());
                  content.polyfillFiles = [];
                  compilation.updateAsset(
                    manifest.name,
                    new compiler.webpack.sources.RawSource(JSON.stringify(content, null, 2)),
                  );
                }

                const middlewareManifest = compilation.getAsset('server/middleware-build-manifest.js');
                if (middlewareManifest) {
                  const content = middlewareManifest.source
                    .source()
                    .toString()
                    .replace(/polyfillFiles:\[[^\]]*\]/, 'polyfillFiles:[]');
                  compilation.updateAsset(
                    middlewareManifest.name,
                    new compiler.webpack.sources.RawSource(content),
                  );
                }
              },
            );
          });
        },
      });
    }

    if (!isServer) {
      // These shims target legacy browsers excluded by the configured Browserslist.
      config.resolve.alias = {
        ...config.resolve.alias,
        '../build/polyfills/polyfill-module$': false,
        '@pixi/polyfill': false,
        'parallax-js$': 'parallax-js/src/parallax.js',
        'object-assign': require.resolve('./src/lib/native-object-assign.js'),
        'raf$': require.resolve('./src/lib/native-raf.js'),
      };
    }

    return config;
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    // Serve the existing local WebP assets directly; FaaS runtimes cannot
    // reliably persist Next.js's on-demand image optimization cache.
    unoptimized: true,
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
