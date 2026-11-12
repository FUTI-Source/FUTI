declare global {
  interface Window {
    umami?: {
      track: (
        eventName?: string | Record<string, any> | ((props: any) => any),
        eventData?: Record<string, any>
      ) => void;
    };
  }
}

interface UmamiOptions {
  url: string;
  websiteId: string;
  lang?: string;
  scriptName?: string;
}

export function initUmami(options: UmamiOptions) {
  const { url, websiteId, lang, scriptName = 'script.js' } = options;

  if (typeof window === 'undefined') return;

  // 页面 lang 在所有环境均设置，便于本地调试
  if (lang) {
    document.documentElement.lang = lang;
  }

  // 仅在生产环境加载 Umami 统计脚本
  if (!import.meta.env.PROD || !url || !websiteId) return;

  if (document.querySelector('script[data-website-id]')) return;

  const script = document.createElement('script');
  script.defer = true;
  script.src = `${url.replace(/\/$/, '')}/${scriptName.replace(/^\//, '')}`;
  script.setAttribute('data-website-id', websiteId);
  document.head.appendChild(script);
}

export function getCurrentLang(): string {
  return document.documentElement.lang || navigator.language || 'zh-CN';
}

export function trackEvent(eventName: string, data?: Record<string, any>) {
  if (!import.meta.env.PROD || typeof window === 'undefined' || !window.umami) {
    return;
  }

  window.umami.track(eventName, {
    lang: getCurrentLang(),
    ...data,
  });
}
