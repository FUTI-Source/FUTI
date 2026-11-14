/* eslint-disable prefer-arrow/prefer-arrow-functions */
import { defineConfig } from '@rsbuild/core';
import { pluginBabel } from '@rsbuild/plugin-babel';
import { pluginReact } from '@rsbuild/plugin-react';
import { GenerateSW } from 'workbox-rspack-plugin';

export default defineConfig({
  output: {
    sourceMap: process.env.NODE_ENV === 'development',
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
      viewport: 'width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover',
      google: 'notranslate',
      'http-equiv': {
        'http-equiv': 'Content-Language',
        content: 'en',
      },
      description: '一位正在努力钻研前端开发的开发者，趁年轻，做爱做的事。',
      'apple-mobile-web-app-title': 'FUTI',
      'apple-mobile-web-app-capable': 'yes',
      'apple-mobile-web-app-status-bar-style': 'black-translucent',
      'og:type': { property: 'og:type', content: 'website' },
      'og:title': { property: 'og:title', content: 'FUTI - Personal Homepage' },
      'og:site_name': { property: 'og:site_name', content: 'FUTI - Personal Homepage' },
      'og:description': { property: 'og:description', content: '一位正在努力钻研前端开发的开发者，趁年轻，做爱做的事。' },
      'og:url': { property: 'og:url', content: 'https://www.zhang-wentao.tech' },
      'og:image': { property: 'og:image', content: 'https://www.zhang-wentao.tech/og-image.png' },
      'og:image:alt': { property: 'og:image:alt', content: '一位正在努力钻研前端开发的开发者，趁年轻，做爱做的事。' },
      'twitter:card': { name: 'twitter:card', content: 'summary_large_image' },
      'twitter:title': { name: 'twitter:title', content: 'FUTI - Personal Homepage' },
      'twitter:description': { name: 'twitter:description', content: '一位正在努力钻研前端开发的开发者，趁年轻，做爱做的事。' },
      'twitter:image': { name: 'twitter:image', content: 'https://www.zhang-wentao.tech/og-image.png' },
      'twitter:image:alt': { name: 'twitter:image:alt', content: '一位正在努力钻研前端开发的开发者，趁年轻，做爱做的事。' },
    },
    tags: [
      // 重点：双theme-color，深色优先
      { tag: 'meta', attrs: { name: 'theme-color', content: '#15161a', media: '(prefers-color-scheme: dark)' } },
      { tag: 'meta', attrs: { name: 'theme-color', content: '#ffffff', media: '(prefers-color-scheme: light)' } },

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
    ],
  },
});
