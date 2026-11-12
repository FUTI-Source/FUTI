/* eslint-disable prefer-arrow/prefer-arrow-functions */
import { defineConfig } from '@rsbuild/core';
import { pluginBabel } from '@rsbuild/plugin-babel';
import { pluginReact } from '@rsbuild/plugin-react';
import { GenerateSW } from 'workbox-rspack-plugin';

export default defineConfig({
  output: {
    // 方式一：简写，开发模式使用 cheap-module-source-map，生产模式生成完整的 source-map
    sourceMap: process.env.NODE_ENV === 'development',
    // 方式二：精细控制，仅在生产环境生成 JS 的 source map
    // sourceMap: {
    //   js: process.env.NODE_ENV === 'production' ? 'source-map' : 'cheap-module-source-map',
    // },
  },
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
    {
      name: 'plugin-html-lang',
      setup(api) {
        api.modifyHTML((html) => {
          return html.replace('<html>', '<html lang="en">');
        });
      },
    },
    pluginReact(),
    pluginBabel({
      include: /\.(?:jsx|tsx)$/,
      babelLoaderOptions(opts) {
        opts.plugins?.unshift('babel-plugin-react-compiler');
      },
    }),
  ],
  html: {
    title: 'FUTI - Personal Homepage',
    meta: {
       google: 'notranslate',
      'http-equiv': {
      'http-equiv': 'Content-Language',
      content: 'en',
       },
      description: '一位正在努力钻研前端开发的开发者，趁年轻，做爱做的事。',
      'apple-mobile-web-app-title': 'FUTI',
      'apple-mobile-web-app-capable': 'yes',
      'apple-mobile-web-app-status-bar-style': 'default',
      'og:type': { property: 'og:type', content: 'website' },
      'og:title': { property: 'og:title', content: 'FUTI - Personal Homepage' },
      'og:site_name': { property: 'og:site_name', content: 'FUTI - Personal Homepage' },
      'og:description': { property: 'og:description', content: '一位正在努力钻研前端开发的开发者，趁年轻，做爱做的事。' },
      'og:url': { property: 'og:url', content: 'https://www.zhang-wentao.tech' },
      'og:image': { property: 'og:image', content: 'https://www.zhang-wentao.tech/og-image.png' },
      // X (Twitter) 卡片
      'twitter:card': { name: 'twitter:card', content: 'summary_large_image' },
      'twitter:title': { name: 'twitter:title', content: 'FUTI - Personal Homepage' },
      'twitter:description': { name: 'twitter:description', content: '一位正在努力钻研前端开发的开发者，趁年轻，做爱做的事。' },
      'twitter:image': { name: 'twitter:image', content: 'https://www.zhang-wentao.tech/og-image.png' },
    },
    tags: [
      // 1. 引入你自己写的完整 public/manifest.webmanifest
      // QQ 手机端分享专属标签
      { tag: 'meta', attrs: { itemprop: 'name', content: 'FUTI - Personal Homepage' } },
      { tag: 'meta', attrs: { itemprop: 'description', content: '一位正在努力钻研前端开发的开发者，趁年轻，做爱做的事。' } },
      { tag: 'meta', attrs: { itemprop: 'image', content: 'https://www.zhang-wentao.tech/icon-192.png' } },
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
          href: '/icon-192.png',
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
