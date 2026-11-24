/**
 * 进程内 TTL 去重表。
 *
 * 只保证单实例、单窗口内不重复，用来吃掉支付网关的回调重试与「回调 + 查单」双通道
 * 撞车的重复通知；不能当业务幂等用——订单状态仍以网关查单结果为准。
 * key 按插入顺序排列且窗口固定，所以过期项总在队首，清理是 O(过期数)。
 */
export function createDedupe(options: { windowMs: number; max?: number }): {
  markOnce: (key: string) => boolean;
} {
  const { windowMs, max = 4096 } = options;
  const seen = new Map<string, number>();

  function markOnce(key: string): boolean {
    const now = Date.now();

    for (const [expiredKey, expiresAt] of seen) {
      if (expiresAt > now) break;
      seen.delete(expiredKey);
    }

    if (seen.has(key)) return false;

    if (seen.size >= max) {
      const oldest = seen.keys().next();
      if (!oldest.done) seen.delete(oldest.value);
    }

    seen.set(key, now + windowMs);
    return true;
  }

  return { markOnce };
}
