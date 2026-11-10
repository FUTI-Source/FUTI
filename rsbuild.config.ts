/* eslint-disable prefer-arrow/prefer-arrow-functions */
import { defineConfig } from '@rsbuild/core';
import { pluginBabel } from '@rsbuild/plugin-babel';
import { pluginReact } from '@rsbuild/plugin-react';
import { GenerateSW } from 'workbox-rspack-plugin'; // 💡 引入新插件

export default defineConfig({
  tools: {
    rspack: (config, { appendPlugins, isProd }) => {
      if (isProd) {
        appendPlugins([
          // 💡 自动生成全套 Service Worker 缓存逻辑，无需本地编写任何 sw 文件
          new GenerateSW({
            clientsClaim: true,
            skipWaiting: true,
            swDest: 'sw.js', // 打包后自动在 dist 根目录输出 sw.js
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
      {
        tag: 'meta',
        attrs: {
          name: 'theme-color',
          media: '(prefers-color-scheme: light)',
          content: '#ffffff',
        },
      },
      {
        tag: 'meta',
        attrs: {
          name: 'theme-color',
          media: '(prefers-color-scheme: dark)',
          content: '#09090b',
        },
      },
      {
        tag: 'meta',
        attrs: {
          name: 'apple-mobile-web-app-capable',
          content: 'yes',
        },
      },
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
