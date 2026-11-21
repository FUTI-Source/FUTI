type UmamiValue = string | number | boolean;

export type UmamiData = Record<string, UmamiValue | null | undefined>;

interface UmamiClient {
  track: (eventName: string, eventData?: UmamiData) => void;
  identify?: (data: UmamiData | string) => void;
  getSession?: () => { cache: string; website: string };
}

declare global {
  interface Window {
    umami?: UmamiClient;
  }
}

interface UmamiOptions {
  url: string;
  websiteId: string;
  /** 只统计这些域名，多个用逗号分隔 */
  domains?: string;
  /** 站点标签，用于区分同一实例下的多个站点 */
  tag?: string;
  /** 环境标识，例如 production / preview */
  environment?: string;
  /** 版本号，例如构建时间或 commit */
  release?: string;
  /** 关闭自动事件（data-umami-event 等），默认开启 */
  autoTrack?: boolean;
  /** 关闭 SPA 自动页面浏览，默认开启 */
  autoPageview?: boolean;
  /** 尊重浏览器 Do Not Track */
  doNotTrack?: boolean;
  /** 统计时去掉查询参数，默认开启 */
  excludeSearch?: boolean;
  /** 统计时去掉 URL 锚点，默认开启 */
  excludeHash?: boolean;
  /** 使用内置 Web Vitals 采集（TTFB/FCP/LCP/CLS/INP） */
  performance?: boolean;
}

/** 脚本加载前产生的事件先排队，避免首屏交互丢失 */
const pending: Array<(client: UmamiClient) => void> = [];
let waiting = false;

function flush(client: UmamiClient) {
  const queue = pending.splice(0, pending.length);
  queue.forEach((callback) => callback(client));
}

function whenUmamiReady(callback: (client: UmamiClient) => void) {
  if (typeof window === 'undefined') return;
  if (window.umami) {
    callback(window.umami);
    return;
  }

  pending.push(callback);
  if (waiting) return;

  waiting = true;
  let attempts = 0;
  const tick = () => {
    if (window.umami) {
      waiting = false;
      flush(window.umami);
      return;
    }
    // 最多等待 5 秒；脚本被拦截时直接丢弃，避免无限轮询
    if (++attempts > 20) {
      waiting = false;
      pending.length = 0;
      return;
    }
    setTimeout(tick, 250);
  };
  setTimeout(tick, 250);
}

export function initUmami(options: UmamiOptions) {
  const { url, websiteId } = options;

  if (typeof window === 'undefined') return;

  // 仅在生产环境加载 Umami 统计脚本
  if (process.env.NODE_ENV !== 'production' || !url || !websiteId) return;
  if (document.querySelector('script[data-website-id]')) return;

  const base = url.replace(/\/$/, '');
  const script = document.createElement('script');
  script.defer = true;
  script.src = `${base}/script.js`;

  const attr = (name: string, value?: string | boolean) => {
    if (value === undefined || value === '') return;
    script.setAttribute(name, String(value));
  };

  attr('data-website-id', websiteId);
  attr('data-host-url', base);
  attr('data-domains', options.domains);
  attr('data-tag', options.tag);
  attr('data-environment', options.environment);
  attr('data-release', options.release);
  attr('data-do-not-track', options.doNotTrack);
  attr('data-performance', options.performance);
  // 默认开启，只有显式关闭时才写入
  if (options.autoTrack === false) attr('data-auto-track', 'false');
  if (options.autoPageview === false) attr('data-auto-pageview', 'false');
  // 默认关闭，显式开启时才写入
  if (options.excludeSearch !== false) attr('data-exclude-search', 'true');
  if (options.excludeHash !== false) attr('data-exclude-hash', 'true');

  document.head.appendChild(script);
}

export function getCurrentLang(): string {
  return document.documentElement.lang || navigator.language || 'zh-CN';
}

/** 给当前会话打标签，例如语言、是否主屏应用、设备类型 */
export function identifyUmami(data: UmamiData) {
  if (process.env.NODE_ENV !== 'production' || typeof window === 'undefined') return;
  whenUmamiReady((client) => client.identify?.(data));
}

export function trackEvent(eventName: string, data?: UmamiData) {
  if (process.env.NODE_ENV !== 'production' || typeof window === 'undefined') return;

  whenUmamiReady((client) => {
    client.track(eventName, {
      lang: getCurrentLang(),
      ...data,
    });
  });
}
