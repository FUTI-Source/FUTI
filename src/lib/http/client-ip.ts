/**
 * 解析真实客户端 IP。
 *
 * `x-forwarded-for` 左侧条目由客户端自己写入，可以任意伪造；边缘节点会把
 * 它实际看到的对端地址追加到最右侧，因此取值优先级为：
 * 平台专有的可信头 → XFF 最右侧条目 → 其余候选头。
 * 取不到合法 IP 时返回 null，由调用方决定降级策略。
 */

/** 各 CDN/边缘平台的权威客户端地址头，由平台写入、客户端无法覆盖 */
const TRUSTED_IP_HEADERS = [
  'cf-connecting-ip',
  'true-client-ip',
  'x-azure-clientip',
  'x-nf-client-connection-ip',
  'x-forwarded-client-ip',
] as const;

const FALLBACK_HEADERS = ['x-real-ip', 'x-client-ip'] as const;

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

export function resolveClientId(headers: Headers): string | null {
  for (const name of TRUSTED_IP_HEADERS) {
    const ip = normalize(headers.get(name));
    if (ip) return ip;
  }

  const forwarded = headers.get('x-forwarded-for');
  if (forwarded) {
    const chain = forwarded
      .split(',')
      .map((entry) => normalize(entry))
      .filter((entry): entry is string => entry !== null);

    // 从右往左：最右侧是边缘节点实际观测到的对端地址
    for (let i = chain.length - 1; i >= 0; i -= 1) {
      if (!NON_PUBLIC.test(chain[i])) return chain[i];
    }

    // 全部是私网（本地开发或链路配置异常）时退回最右侧，仍优于取可伪造的最左侧
    const last = chain[chain.length - 1];
    if (last) return last;
  }

  for (const name of FALLBACK_HEADERS) {
    const ip = normalize(headers.get(name));
    if (ip) return ip;
  }

  return null;
}
