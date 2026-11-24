import { NextResponse, type NextRequest } from 'next/server';

import { isBrowserSupported } from '@/lib/browser-support';
import { SITE_BROWSER_CHECK, SITE_DOMAIN, SITE_HOSTNAME, SITE_WWW_REDIRECT } from '~/site.config';

/**
 * 站点级请求处理：
 * 1. 主机名归一化：裸域自动补 www。
 * 2. 浏览器版本检查：低于最低版本的浏览器重定向到版本过低页。
 *
 * 单域名架构下，境内 IGA Pages 与境外 Vercel 共用 SITE_HOSTNAME，分流完全
 * 由 DNS 分线路完成；这里不做地域判定、跨域跳转或 site-region Cookie。
 * proxy 在每个命中的请求上运行，Next 16 起固定跑在 Node.js 运行时。
 *
 * 裸域规则由 SITE_URL 派生的主机名动态生成；localhost、平台预览域名
 * 不在名单里，不会被误加 www 跳到生产。
 */

/** 裸域 → www 的主机名白名单：www 版本 + 裸域版本，由 SITE_URL 自动派生 */
const wwwManagedHosts = new Set([SITE_HOSTNAME, SITE_DOMAIN]);

export function proxy(request: NextRequest) {
  const hostname = (request.headers.get('host') ?? '').split(':')[0].toLowerCase();
  const { pathname, search } = request.nextUrl;

  // 裸域统一补 www。308 保留方法与请求体，路径与查询串原样带过去。
  if (
    SITE_WWW_REDIRECT.enabled &&
    wwwManagedHosts.has(hostname) &&
    !hostname.startsWith('www.')
  ) {
    return NextResponse.redirect(
      new URL(`https://www.${hostname}${pathname}${search}`),
      SITE_WWW_REDIRECT.statusCode,
    );
  }

  // 浏览器版本检查：只拦页面导航（GET/HEAD），放过版本过低页自身，避免重定向死循环。
  // 机器人、爬虫与无法识别的 UA 在 browser-support 里一律放行。
  const ua = request.headers.get('user-agent') ?? '';
  if (
    SITE_BROWSER_CHECK.enabled &&
    (request.method === 'GET' || request.method === 'HEAD') &&
    pathname !== SITE_BROWSER_CHECK.unsupportedPath &&
    !isBrowserSupported(ua, request.headers.get('sec-ch-ua'))
  ) {
    return NextResponse.redirect(new URL(SITE_BROWSER_CHECK.unsupportedPath, request.url));
  }

  return NextResponse.next();
}

export const config = {
  // 只拦页面与无扩展名路径：API（含微信/支付宝异步回调）不能被重定向，
  // 带扩展名的静态资源交给 CDN 直接命中，不进 proxy。
  matcher: ['/((?!api|_next|.*\\..*).*)'],
};
