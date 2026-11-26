import { NextResponse, type NextRequest } from 'next/server';

import { isBrowserSupported } from '@/lib/browser-support';
import { SITE_DOMAIN, SITE_HOSTNAME, SITE_WWW_REDIRECT } from '@/config/site';

/**
 * 站点级请求处理：
 * 1. 主机名归一化：裸域自动补 www。
 * 2. 浏览器版本检查：低于最低版本的浏览器重定向到版本过低页。
 *
 * Vercel 是唯一源站：境内经 DNS 中国内地线路进火山 DCDN 再回源 Vercel，
 * 境外直连 Vercel，两条链路共用 SITE_HOSTNAME（DCDN 回源保留原 Host）。
 * 分流完全由 DNS 完成；这里不做地域判定、跨域跳转或 site-region Cookie。
 * proxy 在每个命中的请求上运行，Next 16 起固定跑在 Node.js 运行时。
 *
 * 裸域规则由 SITE_URL 派生的主机名动态生成；localhost、平台预览域名
 * 不在名单里，不会被误加 www 跳到生产。
 */

/** 裸域 → www 的主机名白名单：www 版本 + 裸域版本，由 SITE_URL 自动派生 */
const wwwManagedHosts = new Set([SITE_HOSTNAME, SITE_DOMAIN]);

/**
 * 版本过低提示页（内置为 Route Handler，见 src/app/browser-unsupported/route.ts，零 JS）。
 * 与 public/scripts/browser-check.js 里的跳转路径保持一致，无需配置、直接定死。
 */
const UNSUPPORTED_PATH = '/browser-unsupported';

/**
 * 误判逃生：版本过低页的「继续访问」链接带 ?browser-check-continue=1，
 * proxy 命中后放行并种一个会话级 Cookie，后续导航凭 Cookie 继续放行。
 */
const CONTINUE_FLAG = 'browser-check-continue';

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
    (request.method === 'GET' || request.method === 'HEAD') &&
    pathname !== UNSUPPORTED_PATH &&
    !isBrowserSupported(ua, request.headers.get('sec-ch-ua'))
  ) {
    // 用户已从兜底页确认继续：放行并（首次）种会话 Cookie，不写过期时间
    if (request.nextUrl.searchParams.has(CONTINUE_FLAG) || request.cookies.get(CONTINUE_FLAG)?.value === '1') {
      const response = NextResponse.next();
      if (!request.cookies.get(CONTINUE_FLAG)) {
        response.cookies.set(CONTINUE_FLAG, '1', { path: '/', sameSite: 'lax' });
      }
      return response;
    }
    // 显式 307 + no-store：条件跳转绝不能被共享缓存（DCDN / Edge）按 URL 缓存，
    // 否则某个旧 UA 触发的跳转会被错发给现代浏览器。
    return NextResponse.redirect(new URL(UNSUPPORTED_PATH, request.url), {
      status: 307,
      headers: { 'Cache-Control': 'no-store' },
    });
  }

  return NextResponse.next();
}

export const config = {
  // 只拦页面与无扩展名路径：API（含微信/支付宝异步回调）不能被重定向，
  // 带扩展名的静态资源交给 CDN 直接命中，不进 proxy。
  matcher: ['/((?!api|_next|.*\\..*).*)'],
};
