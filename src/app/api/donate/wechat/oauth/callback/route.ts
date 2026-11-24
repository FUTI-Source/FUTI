import { timingSafeEqual } from 'node:crypto';

import { NextRequest, NextResponse } from 'next/server';

import { getOpenidCookieKey } from '@/config/env';
import { logger } from '@/lib/logger';
import { SITE_URL } from '~/site.config';
import {
  exchangeWechatOpenid,
  getWechatJsapiConfig,
  resolveSafeRedirect,
  signOpenid,
} from '@/features/donate/server/wechat/oauth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const OPENID_COOKIE_MAX_AGE = 2 * 60 * 60;

/** 微信授权回调：校验 state → 换 openid → 写 Cookie → 跳回原页面 */
export async function GET(request: NextRequest) {
  const config = getWechatJsapiConfig();
  if (!config) {
    return NextResponse.json(
      { error: { code: 'GATEWAY_NOT_CONFIGURED', message: '微信内支付尚未配置' } },
      { status: 503 },
    );
  }

  const url = new URL(request.url);
  const callbackOrigin = SITE_URL;
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const expectedState = request.cookies.get('wx_oauth_state')?.value;
  const redirect = resolveSafeRedirect(url.searchParams.get('redirect'), callbackOrigin);

  if (!code || !state || !expectedState) {
    return NextResponse.json(
      { error: { code: 'INVALID_OAUTH_STATE', message: '微信授权校验失败，请返回重试' } },
      { status: 400 },
    );
  }

  // 常量时间比较 state，防止时序攻击
  const stateBuffer = Buffer.from(state);
  const expectedBuffer = Buffer.from(expectedState);
  if (
    stateBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(stateBuffer, expectedBuffer)
  ) {
    return NextResponse.json(
      { error: { code: 'INVALID_OAUTH_STATE', message: '微信授权校验失败，请返回重试' } },
      { status: 400 },
    );
  }

  let openid: string;
  try {
    openid = await exchangeWechatOpenid({
      appId: config.appId,
      appSecret: config.appSecret,
      code,
    });
  } catch (error) {
    logger.error('[donate] 微信授权失败', error);
    return NextResponse.json(
      { error: { code: 'GATEWAY_FAILED', message: '微信授权失败，请稍后重试' } },
      { status: 502 },
    );
  }

  const cookieKey = getOpenidCookieKey();
  if (!cookieKey) {
    logger.error('[donate] 无法获取 openid cookie 签名密钥');
    return NextResponse.json(
      { error: { code: 'GATEWAY_NOT_CONFIGURED', message: '微信内支付尚未配置' } },
      { status: 503 },
    );
  }

  const response = NextResponse.redirect(new URL(redirect, callbackOrigin));
  response.cookies.set('wx_openid', signOpenid(openid, cookieKey), {
    httpOnly: true,
    sameSite: 'lax',
    secure: callbackOrigin.startsWith('https:'),
    path: '/',
    maxAge: OPENID_COOKIE_MAX_AGE,
  });
  response.cookies.delete('wx_oauth_state');
  return response;
}
