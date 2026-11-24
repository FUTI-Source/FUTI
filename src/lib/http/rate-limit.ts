/**
 * 滑动窗口限流。
 *
 * 计数保存在 Node 进程内存中，多实例之间不共享；需要全局精确限流时
 * 应接入共享存储（Redis 等）或部署平台 WAF。这里只保证单实例内的上限。
 */

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds: number;
}

export interface RateLimiter {
  check(clientId: string, now?: number): RateLimitResult;
  readonly windowMs: number;
  readonly max: number;
}

export interface RateLimiterOptions {
  windowMs: number;
  max: number;
  /** 同时跟踪的客户端上限，防止被随机 IP 撑爆内存 */
  maxTrackedClients?: number;
}

export function createRateLimiter({
  windowMs,
  max,
  maxTrackedClients = 10_000,
}: RateLimiterOptions): RateLimiter {
  const requestsByClient = new Map<string, number[]>();
  let requestsSinceCleanup = 0;

  return {
    windowMs,
    max,
    check(clientId, now = Date.now()): RateLimitResult {
      const windowStart = now - windowMs;
      const recent = (requestsByClient.get(clientId) ?? []).filter(
        (timestamp) => timestamp > windowStart,
      );

      if (recent.length >= max) {
        requestsByClient.set(clientId, recent);
        return {
          allowed: false,
          retryAfterSeconds: Math.max(1, Math.ceil((recent[0] + windowMs - now) / 1000)),
        };
      }

      recent.push(now);
      requestsByClient.set(clientId, recent);
      requestsSinceCleanup += 1;

      if (requestsSinceCleanup >= 128 || requestsByClient.size > maxTrackedClients) {
        requestsSinceCleanup = 0;
        for (const [key, timestamps] of requestsByClient) {
          if (timestamps.every((timestamp) => timestamp <= windowStart)) {
            requestsByClient.delete(key);
          }
        }

        while (requestsByClient.size > maxTrackedClients) {
          const oldest = requestsByClient.keys().next().value;
          if (oldest === undefined) break;
          requestsByClient.delete(oldest);
        }
      }

      return { allowed: true, retryAfterSeconds: 0 };
    },
  };
}

/** 留言：10 分钟 5 次 */
export const contactRateLimiter = createRateLimiter({ windowMs: 10 * 60_000, max: 5 });

/** 下单：10 分钟 10 笔，拦住批量刷单（每笔都会在支付网关建立真实订单） */
export const donateCreateRateLimiter = createRateLimiter({ windowMs: 10 * 60_000, max: 10 });

/**
 * 查单：每分钟 40 次。
 * 每次查单都会真实调用一次网关接口，必须留够前端退避轮询的额度，
 * 又不能让人把一个令牌当成打网关的放大器。
 */
export const donateStatusRateLimiter = createRateLimiter({ windowMs: 60_000, max: 40 });
