export function initForceLightTheme() {
  if (typeof window === 'undefined') return;

  const html = document.documentElement;

  // 1. 声明 CSS 与 Meta 仅支持浅色
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
  setOrUpdateMeta('theme-color', '#ffffff');
  setOrUpdateMeta('apple-mobile-web-app-status-bar-style', 'default');

  // 2. 注入全局 CSS：彻底解决 iOS 端 SVG 变黑问题
  if (!document.getElementById('force-light-style')) {
    const styleEl = document.createElement('style');
    styleEl.id = 'force-light-style';
    styleEl.textContent = `
      :root, html, body {
        color-scheme: light only !important;
      }

      /* 针对内联 <svg> 图标：防止继承浏览器重置后的默认黑色文字，强制使用亮白色填充 */
      svg {
        color-scheme: light only !important;
        color: #f8fafc !important;
      }

      /* 覆盖 SVG 内部可能写死的黑色 fill 或 stroke 属性 */
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

      /* 针对通过 <img src="xxx.svg"> 引入的纯黑外部 SVG 图标，在 iOS 上反转为纯白色 */
      img[src$=".svg"],
      img[src*=".svg?"] {
        filter: brightness(0) invert(1) !important;
        -webkit-filter: brightness(0) invert(1) !important;
      }
    `;
    document.head.appendChild(styleEl);
  }

  // 3. 清理本地存储中的深色主题缓存
  try {
    if (localStorage.getItem('theme') === 'dark') {
      localStorage.setItem('theme', 'light');
    }
  } catch {
    // 忽略无痕模式报错
  }

  // 4. 持续拦截 DOM 上的 dark 类名或属性切换
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
