/* eslint-disable prefer-arrow/prefer-arrow-functions */
import { defineConfig } from '@rsbuild/core';
import { pluginBabel } from '@rsbuild/plugin-babel';
import { pluginReact } from '@rsbuild/plugin-react';
import { GenerateSW } from 'workbox-rspack-plugin'; // 💡 引入新插件

export default defineConfig({
  tools: {
    rspack: (config, { appendPlugins }) => {
      if (process.env.NODE_ENV === 'production') {
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
      description: "一位正在努力钻研前端开发的开发者，趁年轻，做爱做的事。",
    },
    tags: [
      {
        tag: 'script',
        attrs: {
          defer: true,
          src: 'https://zhang-wentao.tech',
          'data-website-id': 'a5e4fd0e-7052-473c-b7eb-8b6f42b968eb',
        },
      },
    ],
  },
});
