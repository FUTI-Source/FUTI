export function initForceLightTheme() {
  if (typeof window === 'undefined') return;

  const html = document.documentElement;

  // 1. 强制声明根元素仅允许浅色渲染（阻止 iOS Safari 15+ 的系统级智能反色）
  html.style.setProperty('color-scheme', 'light only', 'important');

  const setOrUpdateMeta = (name: string, content: string) => {
    let meta = document.querySelector(`meta[name="${name}"]`);
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', name);
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', content);
  };

  // 标准与苹果历史版本防深色声明
  setOrUpdateMeta('color-scheme', 'light only');
  setOrUpdateMeta('supported-color-schemes', 'light');

  // 锁定 iOS Safari 顶部刘海/灵动岛状态栏与底部安全区为浅色（防止系统深色时上下边栏变黑）
  setOrUpdateMeta('theme-color', '#ffffff');
  setOrUpdateMeta('apple-mobile-web-app-capable', 'yes');
  setOrUpdateMeta('apple-mobile-web-app-status-bar-style', 'default');

  // 2. 注入全局防深色兜底 CSS
  if (!document.getElementById('force-light-style')) {
    const styleEl = document.createElement('style');
    styleEl.id = 'force-light-style';
    styleEl.textContent = `
      :root, html, body {
        color-scheme: light only !important;
        -webkit-color-scheme: light only !important;
      }

      /* 防止 iOS Safari 夜间模式下自动压暗图片、视频、Canvas（Live2D） */
      img, video, canvas {
        color-scheme: light only !important;
        filter: none !important;
        -webkit-filter: none !important;
      }

      /* 保持内联 SVG 为亮色，防止继承浅色重置后的黑色文字 */
      svg {
        color-scheme: light only !important;
        color: #f8fafc !important;
      }

      svg path[fill="#000"],
      svg path[fill="#000000"],
      svg path[fill="black"],
      svg path:not([fill]),
      svg circle[fill="#000"],
      svg circle[fill="#000000"],
      svg rect[fill="#000"],
      svg rect[fill="#000000"] {
        fill: #f8fafc !important;
      }

      img[src$=".svg"],
      img[src*=".svg?"] {
        filter: brightness(0) invert(1) !important;
        -webkit-filter: brightness(0) invert(1) !important;
      }
    `;
    document.head.appendChild(styleEl);
  }

  // 3. 清理本地存储中的深色缓存
  try {
    if (localStorage.getItem('theme') === 'dark') {
      localStorage.setItem('theme', 'light');
    }
  } catch {
    // 忽略无痕模式限制
  }

  // 4. 实时拦截 DOM 上的 dark 类名切换
  const enforceLight = () => {
    if (html.classList.contains('dark')) {
      html.classList.remove('dark');
    }
    if (!html.classList.contains('light')) {
      html.classList.add('light');
    }
    if (html.getAttribute('data-theme') === 'dark') {
      html.setAttribute('data-theme', 'light');
    }
  };

  enforceLight();

  const observer = new MutationObserver(enforceLight);
  observer.observe(html, {
    attributes: true,
    attributeFilter: ['class', 'data-theme', 'style'],
  });

  return () => observer.disconnect();
}
