import {
  SITE_ANALYTICS_URL,
  SITE_ANALYTICS_WEBSITE_ID,
  SITE_HOSTNAME,
  SITE_LANG,
  SITE_USER_AGENT,
} from '../../../lib/site';
import type { StoredDonationOrder } from './orders';

/**
 * 向 Umami 上报打赏收入事件。
 * 只有 claimPaid 成功的调用方会触发，保证每笔订单只记一次。
 * 上报失败仅记录日志，不影响支付结果。
 */
export async function trackDonationRevenue(order: StoredDonationOrder): Promise<void> {
  try {
    const response = await fetch(`${SITE_ANALYTICS_URL.replace(/\/+$/, '')}/api/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': SITE_USER_AGENT,
      },
      body: JSON.stringify({
        type: 'event',
        payload: {
          website: SITE_ANALYTICS_WEBSITE_ID,
          hostname: SITE_HOSTNAME,
          language: SITE_LANG,
          url: '/',
          name: 'donation',
          data: {
            revenue: order.amount,
            currency: 'CNY',
            channel: order.channel,
            orderId: order.orderId,
          },
        },
      }),
      cache: 'no-store',
      signal: AbortSignal.timeout(3000),
    });

    if (!response.ok) {
      console.warn(`[donate] Umami 收入上报失败：${response.status}`);
    }
  } catch (error) {
    console.warn('[donate] Umami 收入上报异常', error);
  }
}
