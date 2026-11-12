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

  if (typeof window === 'undefined' || !url || !websiteId) return;

  if (lang) {
    document.documentElement.lang = lang;
  }

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
  if (typeof window === 'undefined' || !window.umami) return;

  window.umami.track(eventName, {
    lang: getCurrentLang(),
    ...data,
  });
}
