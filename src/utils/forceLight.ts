export function initForceLightTheme() {
  if (typeof window === 'undefined') return;

  const html = document.documentElement;

  // 1. 声明页面仅支持浅色模式，禁止浏览器自动变暗（如部分手机浏览器的强制夜间模式）
  html.style.colorScheme = 'light';
  
  let meta = document.querySelector('meta[name="color-scheme"]');
  if (!meta) {
    meta = document.createElement('meta');
    meta.setAttribute('name', 'color-scheme');
    document.head.appendChild(meta);
  }
  meta.setAttribute('content', 'light only');

  // 2. 清理主流主题库（如 next-themes 或自定义存储）的缓存记录
  try {
    if (localStorage.getItem('theme') === 'dark') {
      localStorage.setItem('theme', 'light');
    }
  } catch {
    // 忽略无痕模式下的存储限制
  }

  // 3. 立即移除现有的深色类名和属性，并持续拦截后续的深色切换
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

  // 监听 DOM 属性变化，防止其他组件或按钮再次切回深色
  const observer = new MutationObserver(enforceLight);
  observer.observe(html, {
    attributes: true,
    attributeFilter: ['class', 'data-theme'],
  });

  return () => observer.disconnect();
}
