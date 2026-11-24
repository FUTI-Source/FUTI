import { trackEvent } from '@/lib/umami';

import type { DonateChannel } from './types';

const DEDUPE_PREFIX = 'donation-revenue:';
const tracked = new Set<string>();

/** 客户端上报打赏收入，同一订单在当前会话内只上报一次 */
export function trackDonationRevenue(input: {
  orderId: string;
  amount: number;
  channel: DonateChannel;
}): void {
  if (tracked.has(input.orderId)) return;
  tracked.add(input.orderId);

  try {
    const key = `${DEDUPE_PREFIX}${input.orderId}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, '1');
  } catch {
    // 隐私模式下存储不可用，退化为仅内存去重
  }

  trackEvent('donation', {
    revenue: input.amount,
    currency: 'CNY',
    channel: input.channel,
    orderId: input.orderId,
  });
}
