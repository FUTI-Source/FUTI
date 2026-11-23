import type { MetadataRoute } from 'next';

import { SITE_AUTHOR_NAME, SITE_DESCRIPTION, SITE_LANG } from '@/lib/site';

/** PWA 主题色固定，不随站点配置变化 */
const THEME_COLOR = '#15161a';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE_AUTHOR_NAME,
    short_name: SITE_AUTHOR_NAME,
    id: '/',
    lang: SITE_LANG,
    description: SITE_DESCRIPTION,
    display: 'standalone',
    display_override: ['window-controls-overlay', 'standalone'],
    scope: '/',
    start_url: '/',
    // 个人主页同时适配竖屏与横屏（见样式里的 landscape 分支），显式声明 any
    // 避免部分终端按默认 portrait 锁方向。
    orientation: 'any',
    // 便于应用商店/浏览器归类，提升安装面板的展示质量。
    categories: ['personalization', 'portfolio'],
    theme_color: THEME_COLOR,
    background_color: THEME_COLOR,
    icons: [
      {
        src: '/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
    ],
    screenshots: [
      {
        src: '/screenshot-desktop.png',
        sizes: '1280x627',
        type: 'image/png',
        form_factor: 'wide',
        label: `${SITE_AUTHOR_NAME}个人主页桌面端`,
      },
      {
        src: '/screenshot-mobile.png',
        sizes: '390x751',
        type: 'image/png',
        form_factor: 'narrow',
        label: `${SITE_AUTHOR_NAME}个人主页移动端`,
      },
    ],
  };
}
