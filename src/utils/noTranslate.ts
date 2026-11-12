export function disableBrowserTranslate() {
  if (typeof document === 'undefined') return;

  // 1. 设置标准 HTML5 translate 属性与通用类名
  document.documentElement.setAttribute('translate', 'no');
  document.documentElement.classList.add('notranslate');

  // 2. 注入 Google / Chrome / Edge 专用禁止翻译 Meta 标签
  if (!document.querySelector('meta[name="google"][content="notranslate"]')) {
    const meta = document.createElement('meta');
    meta.name = 'google';
    meta.content = 'notranslate';
    document.head.appendChild(meta);
  }
}
