import { timingSafeEqual } from 'node:crypto';

import { getOpenidCookieKey, getWechatOAuthEnv } from '@/config/env';

import { hmacSha256 } from './crypto';

const OAUTH_AUTHORIZE_URL = 'https://open.weixin.qq.com/connect/oauth2/authorize';
const OAUTH_TOKEN_URL = 'https://api.weixin.qq.com/sns/oauth2/access_token';

interface WechatJsapiConfig {
  appId: string;
  appSecret: string;
}

/** JSAPI 需要公众号 AppID 与 AppSecret，两者齐备才可用 */
export function getWechatJsapiConfig(): WechatJsapiConfig | null {
  return getWechatOAuthEnv();
}

/** 生成网页授权地址，snsapi_base 可静默获取 openid */
export function buildWechatOAuthUrl(input: {
  appId: string;
  redirectUri: string;
  state: string;
}): string {
  const params = new URLSearchParams({
    appid: input.appId,
    redirect_uri: input.redirectUri,
    response_type: 'code',
    scope: 'snsapi_base',
    state: input.state,
  });
  return `${OAUTH_AUTHORIZE_URL}?${params.toString()}#wechat_redirect`;
}

/** 用网页授权 code 换取用户 openid */
export async function exchangeWechatOpenid(input: {
  appId: string;
  appSecret: string;
  code: string;
}): Promise<string> {
  const params = new URLSearchParams({
    appid: input.appId,
    secret: input.appSecret,
    code: input.code,
    grant_type: 'authorization_code',
  });

  let response: Response;
  try {
    response = await fetch(`${OAUTH_TOKEN_URL}?${params.toString()}`, { cache: 'no-store' });
  } catch {
    throw new Error('无法连接微信授权服务');
  }

  const data = (await response.json().catch(() => null)) as {
    openid?: string;
    errcode?: number;
    errmsg?: string;
  } | null;

  if (!response.ok || !data?.openid) {
    throw new Error(data?.errmsg ? `微信授权失败：${data.errmsg}` : '微信授权失败');
  }

  return data.openid;
}

/** 给 openid 加 HMAC 后写入 Cookie，避免被客户端伪造 */
export function signOpenid(openid: string, secret: string): string {
  return `${openid}.${hmacSha256(secret, openid)}`;
}

export function readWechatOpenid(value: string | undefined): string | undefined {
  if (!value) return undefined;

  const key = getOpenidCookieKey();
  if (!key) return undefined;

  const separator = value.lastIndexOf('.');
  if (separator <= 0) return undefined;

  const openid = value.slice(0, separator);
  const provided = Buffer.from(value.slice(separator + 1), 'utf8');
  const expected = Buffer.from(hmacSha256(key, openid), 'utf8');

  if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
    return undefined;
  }

  return openid;
}

/** 只允许跳回本站路径，避免开放重定向 */
export function resolveSafeRedirect(value: string | null, origin: string): string {
  try {
    const url = new URL(value || '/', origin);
    if (url.origin !== origin) return '/';
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return '/';
  }
}
