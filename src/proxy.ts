import { NextResponse, type NextRequest } from 'next/server';

import {
  SITE_DEPLOY_TARGETS,
  SITE_DOMAIN,
  SITE_GEO_ROUTING,
  SITE_HOSTNAME,
  SITE_WWW_REDIRECT,
} from '~/site.config';

/**
 * 站点级主机名跳转：裸域自动补 www + 国内外兜底分流。
 *
 * 只做「与业务无关的重定向决策」，任何页面逻辑都不放这里——
 * proxy 在每个命中的请求上运行，Next 16 起固定跑在 Node.js 运行时
 * （不能再写 `runtime` 导出），Vercel 与 IGA Pages 两侧行为一致。
 *
 * 两个开关都在根目录 site.config.ts：
 *  - SITE_WWW_REDIRECT：裸域 → www。主机名由 SITE_URL 派生，换域名不用改代码。
 *  - SITE_GEO_ROUTING：跨平台兜底跳转，默认关闭；只有拿到可信地域头时才动。
 *
 * 平台预览域名（*.vercel.app 之外的临时域名、*.preview.iga-pages.com）与
 * localhost 不参与裸域补 www，否则会被甩到一个根本不存在的 www 子域上。
 */

/** 裸域 → www 的主机名白名单：www 版本 + 裸域版本，由 SITE_URL 自动派生 */
const wwwManagedHosts = new Set([SITE_HOSTNAME, SITE_DOMAIN]);

function hostOf(url: string): string {
  if (!url) return '';
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    // 配置里填了非法地址时不打断整站请求，按「未配置」处理
    return '';
  }
}

const cnTargetHost = hostOf(SITE_DEPLOY_TARGETS.cn);
const overseasTargetHost = hostOf(SITE_DEPLOY_TARGETS.overseas);

/** 参与地域分流的主机名：站点域名 + 两个平台目标域名（境外目标独立域名时才生效） */
const geoManagedHosts = new Set([
  SITE_HOSTNAME,
  SITE_DOMAIN,
  cnTargetHost,
  overseasTargetHost,
]);

/** 按配置顺序取第一个非空地域头；拿不到就是「未知地域」 */
function readCountry(request: NextRequest): string {
  for (const header of SITE_GEO_ROUTING.countryHeaders) {
    const value = request.headers.get(header)?.trim();
    if (value) return value.toUpperCase();
  }
  return '';
}

export function proxy(request: NextRequest) {
  const hostname = (request.headers.get('host') ?? '').split(':')[0].toLowerCase();
  const { pathname, search } = request.nextUrl;

  // 1. 裸域统一补 www。308 保留方法与请求体，路径与查询串原样带过去。
  if (
    SITE_WWW_REDIRECT.enabled &&
    wwwManagedHosts.has(hostname) &&
    !hostname.startsWith('www.')
  ) {
    const url = new URL(`https://www.${hostname}${pathname}${search}`);
    return NextResponse.redirect(url, SITE_WWW_REDIRECT.statusCode);
  }

  // 2. 国内外兜底分流（默认关闭；缺任一平台地址时不启用，避免把人跳到空地址）
  if (
    !SITE_GEO_ROUTING.enabled ||
    !cnTargetHost ||
    !overseasTargetHost ||
    !geoManagedHosts.has(hostname)
  ) {
    return NextResponse.next();
  }

  // 已经跳过一次就不再跳：跨域时 Cookie 带不过去，但同一平台会记住上次判定，
  // 足以打断 A→B→A（最多多一跳后就地服务）。
  if (request.cookies.get(SITE_GEO_ROUTING.redirectCookie.name)?.value) {
    return NextResponse.next();
  }

  const country = readCountry(request);
  if (!country) return NextResponse.next();

  const isMainland = SITE_GEO_ROUTING.cnCountryCodes
    .map((code) => code.toUpperCase())
    .includes(country);
  const target = hostOf(isMainland ? SITE_DEPLOY_TARGETS.cn : SITE_DEPLOY_TARGETS.overseas);

  // 目标就是当前主机（例如两平台共用同一域名的 DNS 分线路场景）→ 不动作
  if (!target || target === hostname) return NextResponse.next();

  const response = NextResponse.redirect(
    new URL(`https://${target}${pathname}${search}`),
    SITE_GEO_ROUTING.statusCode,
  );
  response.cookies.set({
    name: SITE_GEO_ROUTING.redirectCookie.name,
    value: isMainland ? 'cn' : 'overseas',
    path: '/',
    maxAge: SITE_GEO_ROUTING.redirectCookie.maxAgeSeconds,
    sameSite: 'lax',
    secure: true,
  });
  return response;
}

export const config = {
  // 只拦页面与无扩展名路径：API（含微信/支付宝异步回调）绝不能被跨域重定向，
  // 带扩展名的静态资源交给 CDN 直接命中，不进 proxy。
  matcher: ['/((?!api|_next|.*\\..*).*)'],
};
