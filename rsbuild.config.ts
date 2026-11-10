/* eslint-disable prefer-arrow/prefer-arrow-functions */
import { defineConfig } from '@rsbuild/core';
import { pluginBabel } from '@rsbuild/plugin-babel';
import { pluginReact } from '@rsbuild/plugin-react';
import { InjectManifest } from '@serwist/webpack-plugin';

export default defineConfig({
  tools: {
    rspack: (
      config, { 
        appendPlugins
      }) => {
      if (process.env.NODE_ENV === 'production') {
        appendPlugins([
          newInjectManifest({
            swSrc: './src/sw.ts', // 你的 service worker 源码路径
            swDest: 'sw.js',      // 打包后输出的文件名
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
          src: 'https://umami.zhang-wentao.tech/script.js',
          'data-website-id': 'a5e4fd0e-7052-473c-b7eb-8b6f42b968eb',
        },
      },
    ],
  },
});
