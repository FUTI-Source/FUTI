/* eslint-disable prefer-arrow/prefer-arrow-functions */
import { defineConfig } from '@rsbuild/core';
import { pluginBabel } from '@rsbuild/plugin-babel';
import { pluginReact } from '@rsbuild/plugin-react';
import { GenerateSW } from 'workbox-rspack-plugin';

export default defineConfig({
  tools: {
    rspack: (config, { appendPlugins, isProd }) => {
      if (isProd) {
        appendPlugins([
          new GenerateSW({
            clientsClaim: true,
            skipWaiting: true,
            cleanupOutdatedCaches: true,
            swDest: 'sw.js',
          }),
        ]);
      }
    },
  },
  plugins: [
    pluginReact(),
    pluginBabel({
      include: /\.(?:jsx|tsx)$/,
      babelLoaderOptions(opts) {
        opts.plugins?.unshift('babel-plugin-react-compiler');
      },
    }),
  ],
  html: {
    title: 'FUTI「@futi」- A Fullstack Developer',
    favicon: './public/favicon.ico', // 💡 自动注入网站 Favicon（支持 .ico / .png / .svg）
    meta: {
      description: '一位正在努力钻研前端开发的开发者，趁年轻，做爱做的事。',
      viewport: 'width=device-width, initial-scale=1.0, viewport-fit=cover',
    },
    tags: [
      {
        tag: 'link',
        attrs: {
          rel: 'manifest',
          href: '/manifest.webmanifest',
        },
      },
      // 2. Android / 现代浏览器标准 PWA 声明
      {
        tag: 'meta',
        attrs: {
          name: 'mobile-web-app-capable',
          content: 'yes',
        },
      },
      // 3. iOS Safari 专属全屏 PWA 声明（缺少这行，下面的 status-bar-style 完全无效）
      {
        tag: 'meta',
        attrs: {
          name: 'apple-mobile-web-app-capable',
          content: 'yes',
        },
      },
    ],
  },
});
