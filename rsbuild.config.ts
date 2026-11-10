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
      // 1. Android Chrome / Edge / iOS 15+ Safari 浏览器顶部地址栏与状态栏颜色
      {
        tag: 'meta',
        attrs: {
          name: 'theme-color',
          content: '#22252b',
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
      // 4. iOS 状态栏设为 black-translucent（透明沉浸）或 black（纯黑底白字）
      {
        tag: 'meta',
        attrs: {
          name: 'apple-mobile-web-app-status-bar-style',
          content: 'black-translucent',
        },
      },
    ],
  },
});
