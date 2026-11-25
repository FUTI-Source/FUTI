import { randomBytes } from 'node:crypto';

import { NextResponse } from 'next/server';

import { SITE_URL } from '@/config/site';
import {
  buildWechatOAuthUrl,
  getWechatJsapiConfig,
  resolveSafeRedirect,
} from '@/features/donate/server/wechat/oauth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** 发起微信网页授权，签约后可静默拿到 openid */
export function GET(request: Request) {
  const config = getWechatJsapiConfig();
  if (!config) {
    return NextResponse.json(
      { error: { code: 'GATEWAY_NOT_CONFIGURED', message: '微信内支付尚未配置' } },
      { status: 503 },
    );
  }

  const url = new URL(request.url);
  // 回调地址必须是公众号后台配置的授权域名，避免反向代理导致内网 origin
  const callbackOrigin = SITE_URL;
  const redirect = resolveSafeRedirect(url.searchParams.get('redirect'), callbackOrigin);
  const state = randomBytes(16).toString('hex');

  const callbackUrl = new URL('/api/donate/wechat/oauth/callback', callbackOrigin);
  callbackUrl.searchParams.set('redirect', redirect);

  const authorizeUrl = buildWechatOAuthUrl({
    appId: config.appId,
    redirectUri: callbackUrl.toString(),
    state,
  });

  const response = NextResponse.redirect(authorizeUrl);
  // state 只存服务端 Cookie，回调时比对，防止伪造授权
  response.cookies.set('wx_oauth_state', state, {
    httpOnly: true,
    sameSite: 'lax',
    secure: callbackOrigin.startsWith('https:'),
    path: '/',
    maxAge: 300,
  });
  return response;
}
