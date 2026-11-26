import { createHash, timingSafeEqual } from 'node:crypto';

import { SITE_DCDN_ORIGIN } from '@/config/site';

/**
 * 解析真实客户端 IP（Vercel 单源站 + 火山 DCDN 境内加速）。
 *
 * 取值优先级：
 * 1. 经 DCDN 回源且回源鉴权头正确 → 信任 DCDN 写入的访客 IP 头；
 * 2. Vercel 写入的 x-real-ip（Vercel 会覆盖客户端自带的同名头）；
 * 3. x-forwarded-for 最右侧公网条目（左侧条目可被客户端伪造）。
 *
 * 不再信任 cf-connecting-ip / true-client-ip 等第三方 CDN 头：源站只有 Vercel，
 * 这些头不会由任何可信节点写入，直连请求可以任意伪造。
 * 取不到合法 IP 时返回 null，由调用方决定降级策略。
 */

/** IPv4 / IPv6 的宽松校验，避免把任意字符串当作限流桶键 */
const IPV4 = /^\d{1,3}(\.\d{1,3}){3}$/;
const IPV6 = /^[0-9a-f:]+$/i;

/** 私网、回环与链路本地地址不可能是真实访客，只作为兜底 */
const NON_PUBLIC =
  /^(10\.|127\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|0\.|::1$|::ffff:|fe80)/i;

function normalize(value: string | null | undefined): string | null {
  const ip = value?.trim().replace(/^\[|\]$/g, '').toLowerCase();
  if (!ip || ip === 'unknown' || ip.length > 45) return null;
  if (!IPV4.test(ip) && !(ip.includes(':') && IPV6.test(ip))) return null;
  return ip;
}

/** 先做定长摘要再比较，避免长度差异与逐字节比较泄露密钥信息 */
function digest(value: string): Buffer {
  return createHash('sha256').update(value).digest();
}

function isTrustedDcdnRequest(headers: Headers): boolean {
  const secret = process.env.DCDN_ORIGIN_SECRET;
  const provided = headers.get(SITE_DCDN_ORIGIN.authHeader);
  if (!secret || !provided) return false;
  return timingSafeEqual(digest(secret), digest(provided));
}

export function resolveClientId(headers: Headers): string | null {
  if (isTrustedDcdnRequest(headers)) {
    const ip = normalize(headers.get(SITE_DCDN_ORIGIN.clientIpHeader));
    if (ip) return ip;
  }

  const realIp = normalize(headers.get('x-real-ip'));
  if (realIp) return realIp;

  const forwarded = headers.get('x-forwarded-for');
  if (forwarded) {
    const chain = forwarded
      .split(',')
      .map((entry) => normalize(entry))
      .filter((entry): entry is string => entry !== null);

    for (let i = chain.length - 1; i >= 0; i -= 1) {
      if (!NON_PUBLIC.test(chain[i])) return chain[i];
    }

    // 全部是私网（本地开发）时退回最右侧，仍优于取可伪造的最左侧
    const last = chain[chain.length - 1];
    if (last) return last;
  }

  return null;
}
