/**
 * 浏览器支持判定（服务端检测，供 src/proxy.ts 调用）。
 *
 * 最低版本基线来自 site.config.ts 的 SITE_BROWSER_MINIMUMS，
 * 与 package.json 的 browserslist 保持一致；改基线时两处一起改。
 *
 * 检测策略（按优先级）：
 *  1. 机器人 / 空 UA 一律放行，避免误伤搜索引擎与自动化工具；
 *  2. Chromium 系优先读 Sec-CH-UA Client Hints（UA 被冻结后的更可靠来源）；
 *  3. 回退到 UA 解析：IE、旧版 Edge 直接判不支持；
 *     iOS / iPadOS 上所有浏览器（Safari 及 CriOS、FxiOS、EdgiOS、微信/QQ/UC
 *     等三方与内嵌 WebView）都走系统 WebKit，内核能力只随系统版本走：
 *     优先读 Version/（≈ Safari 版本），微信等 WebView 不带该字段时
 *     回退读 CPU iPhone OS 的系统版本号；
 *     Edge / Chrome / Firefox 各取自己的版本号；Opera、QQ、UC、360、百度、
 *     搜狗、三星等 Chromium 系三方浏览器（桌面与安卓）的 UA 里均带 Chrome/，
 *     统一按 Chrome 内核版本判定；
 *  4. 未能识别的 UA 一律放行——宁可漏判，也不能把正常用户挡在门外。
 */

import { SITE_BROWSER_MINIMUMS } from '~/site.config';

/** 常见爬虫 / 截图 / 自动化环境，不做版本判定 */
const BOT_PATTERN =
  /(bot|crawl|spider|slurp|facebookexternalhit|lighthouse|pagespeed|headlesschrome)/i;

/** 从 Sec-CH-UA（仅含主版本号）里读 Chromium 系品牌版本 */
function readChromiumBrandFromClientHints(
  header: string | null | undefined,
): { minimum: number; major: number } | null {
  if (!header) return null;

  const edge = header.match(/"Microsoft Edge";v="(\d+)"/);
  if (edge) return { minimum: SITE_BROWSER_MINIMUMS.edge, major: Number(edge[1]) };

  const chrome = header.match(/"Google Chrome";v="(\d+)"/);
  if (chrome) return { minimum: SITE_BROWSER_MINIMUMS.chrome, major: Number(chrome[1]) };

  return null;
}

/** 取 UA 里第一个匹配的主版本号；解析失败返回 null（调用方按未知处理） */
function parseMajor(ua: string, pattern: RegExp): number | null {
  const match = ua.match(pattern);
  if (!match) return null;
  const major = Number.parseFloat(match[1]);
  return Number.isFinite(major) ? major : null;
}

/** 解析 iOS / iPadOS 的 WebKit 版本：优先 Safari Version/，其次系统版本 */
function parseIosVersion(ua: string): number | null {
  const safariVersion = parseMajor(ua, /\bVersion\/(\d+(?:\.\d+)?)/);
  if (safariVersion !== null) return safariVersion;

  const match = ua.match(/\b(?:iPhone OS|CPU OS) (\d+)(?:[_.](\d+))?/i);
  if (!match) return null;

  const version = Number.parseFloat(`${match[1]}.${match[2] ?? '0'}`);
  return Number.isFinite(version) ? version : null;
}

/**
 * 判定当前请求的浏览器是否达到站点最低版本要求。
 *
 * @param ua      请求头 User-Agent
 * @param secChUa 请求头 Sec-CH-UA（Chromium 系浏览器提供，可为空）
 */
export function isBrowserSupported(ua: string, secChUa?: string | null): boolean {
  if (!ua || BOT_PATTERN.test(ua)) return true;

  // Client Hints 只在 Chromium 系出现，命中即视为权威结果
  const hinted = readChromiumBrandFromClientHints(secChUa);
  if (hinted) return hinted.major >= hinted.minimum;

  // IE 与旧版（EdgeHTML）Edge 不支持
  if (/MSIE\s|Trident\//.test(ua)) return false;
  if (/\bEdge\/\d/.test(ua) && !/\bEdg\/\d/.test(ua)) return false;

  // iOS / iPadOS：所有浏览器（Safari 与 CriOS、FxiOS、EdgiOS、微信/QQ/UC 等
  // 三方及内嵌 WebView）都强制使用系统 WebKit，内核版本跟随系统，因此
  // 全部按同一基线（SITE_BROWSER_MINIMUMS.ios）判定。
  // 1. 常规 UA 带 Version/（≈ Safari 版本），直接使用；
  // 2. 微信、企业微信等 WebView 的 UA 不带 Version/，回退读
  //    「CPU iPhone OS 17_5」或「CPU OS 17_5」里的系统版本号（17_5 → 17.5）；
  // 3. 两者都拿不到时放行，避免误伤非标准 UA。
  if (/iPhone|iPad|iPod/i.test(ua)) {
    const ios = parseIosVersion(ua);
    return ios === null ? true : ios >= SITE_BROWSER_MINIMUMS.ios;
  }

  // Edge（Chromium 内核：桌面 Edg/、安卓 EdgA/）
  const edge = parseMajor(ua, /\bEdg(?:e|A|iOS)?\/(\d+(?:\.\d+)?)/);
  if (edge !== null) return edge >= SITE_BROWSER_MINIMUMS.edge;

  // Chrome 及 Chromium 系套壳（Opera、微信/QQ/UC 等壳的 UA 均带 Chrome/）
  const chrome = parseMajor(ua, /\bChrome\/(\d+(?:\.\d+)?)/);
  if (chrome !== null) return chrome >= SITE_BROWSER_MINIMUMS.chrome;

  // Firefox
  const firefox = parseMajor(ua, /\bFirefox\/(\d+(?:\.\d+)?)/);
  if (firefox !== null) return firefox >= SITE_BROWSER_MINIMUMS.firefox;

  // Safari（macOS / 桌面模式 iPad）
  const safari = parseMajor(ua, /\bVersion\/(\d+(?:\.\d+)?)/);
  if (safari !== null && /Safari\//.test(ua)) return safari >= SITE_BROWSER_MINIMUMS.safari;

  return true;
}
