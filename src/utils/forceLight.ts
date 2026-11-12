export function initForceLightTheme() {
  if (typeof window === 'undefined') return;

  const html = document.documentElement;

  // 1. 声明 CSS 与 Meta 仅支持浅色（告知 iOS Safari / Chrome 禁止自动反色）
  html.style.colorScheme = 'light only';

  const setOrUpdateMeta = (name: string, content: string) => {
    let meta = document.querySelector(`meta[name="${name}"]`);
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', name);
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', content);
  };

  setOrUpdateMeta('color-scheme', 'light only');
  setOrUpdateMeta('supported-color-schemes', 'light');

  // 2. 锁定 iOS Safari 顶部状态栏与底部刘海安全区背景为白色
  setOrUpdateMeta('theme-color', '#ffffff');
  setOrUpdateMeta('apple-mobile-web-app-status-bar-style', 'default');

  // 3. 注入全局 CSS 兜底（去掉 background-color 强制覆盖，避免遮挡底层 DetroitBackground）
  if (!document.getElementById('force-light-style')) {
    const styleEl = document.createElement('style');
    styleEl.id = 'force-light-style';
    styleEl.textContent = `
      :root, html, body {
        color-scheme: light only !important;
      }
      img, video, canvas, svg {
        filter: none !important;
        -webkit-filter: none !important;
      }
    `;
    document.head.appendChild(styleEl);
  }

  // 4. 清理本地存储中的深色主题缓存
  try {
    if (localStorage.getItem('theme') === 'dark') {
      localStorage.setItem('theme', 'light');
    }
  } catch {
    // 忽略无痕模式报错
  }

  // 5. 持续拦截 DOM 上的 dark 类名或属性切换
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
