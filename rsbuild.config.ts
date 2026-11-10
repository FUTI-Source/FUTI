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
    favicon: './icon-512.png',
    meta: {
      description: '一位正在努力钻研前端开发的开发者，趁年轻，做爱做的事。',
    },
    tags: [
      // 1. 引入你自己写的完整 public/manifest.webmanifest
      {
        tag: 'link',
        attrs: {
          rel: 'manifest',
          href: './manifest.webmanifest',
        },
      },
      // 2. 直接用标签指定 iOS 桌面图标（不触发 Rsbuild 自动生成残缺 manifest）
      {
        tag: 'link',
        attrs: {
          rel: 'apple-touch-icon',
          sizes: '512x512',
          href: '/icon-512.png',
        },
      },
      {
        tag: 'meta',
        attrs: {
          name: 'mobile-web-app-capable',
          content: 'yes',
        },
      },
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
