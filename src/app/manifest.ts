import type { MetadataRoute } from 'next';

import { SITE_AUTHOR_NAME, SITE_DESCRIPTION, SITE_LANG, SITE_PWA } from '@/config/site';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE_AUTHOR_NAME,
    short_name: SITE_AUTHOR_NAME,
    id: '/',
    lang: SITE_LANG,
    description: SITE_DESCRIPTION,
    // 桌面安装默认启用 WCO：display_override 优先于 display；
    // Next 的 Manifest 类型里 display 不接受 window-controls-overlay，故保留 standalone 作回退值。
    display: 'standalone',
    display_override: ['window-controls-overlay', 'standalone'],
    scope: '/',
    start_url: '/',
    // 个人主页同时适配竖屏与横屏（见样式里的 landscape 分支），显式声明 any
    // 避免部分终端按默认 portrait 锁方向。
    orientation: 'any',
    // 便于应用商店/浏览器归类，提升安装面板的展示质量。
    categories: ['personalization', 'portfolio'],
    theme_color: SITE_PWA.themeColor,
    background_color: SITE_PWA.themeColor,
    icons: SITE_PWA.icons.map((icon) => ({ ...icon })),
    screenshots: SITE_PWA.screenshots.map((screenshot) => ({
      src: screenshot.src,
      sizes: screenshot.sizes,
      type: screenshot.type,
      form_factor: screenshot.formFactor,
      label: `${SITE_AUTHOR_NAME}个人主页${screenshot.formFactor === 'wide' ? '桌面端' : '移动端'}`,
    })),
  };
}
