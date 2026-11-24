import { NextResponse } from 'next/server';

import { notifyDonationSuccess } from '@/features/donate/server/notice';
import { verifyPaypalWebhook } from '@/features/donate/server/paypal';
import { readRawBody } from '@/lib/http/api-response';
import { logger } from '@/lib/logger';

/**
 * PayPal Webhook 回调（服务端对服务端）。
 *
 * capture 接口是主通知路径；本路由是冗余保障——用户 approve 后浏览器中断、
 * capture 请求丢失时，PayPal 的 PAYMENT.CAPTURE.COMPLETED 事件会兜底通知到这里。
 * 通知去重由 notifyDonationSuccess 内部吸收，两个来源只会发一次通知。
 *
 * 回调地址（PayPal 开发者后台配置）：{SITE_URL}/api/donate/webhook/paypal
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_BODY_BYTES = 256 * 1024;

interface PaypalWebhookEvent {
  event_type?: string;
  resource?: {
    custom_id?: string;
    amount?: { value?: string; currency_code?: string };
    status?: string;
  };
}

export async function POST(request: Request) {
  const rawBodyResult = await readRawBody(request, MAX_BODY_BYTES);
  if (!rawBodyResult.ok) return rawBodyResult.response;

  let event: PaypalWebhookEvent;
  try {
    event = JSON.parse(rawBodyResult.data) as PaypalWebhookEvent;
  } catch {
    return NextResponse.json({ error: { code: 'BAD_REQUEST', message: '回调体不是合法 JSON' } }, { status: 400 });
  }

  let verified: boolean;
  try {
    verified = await verifyPaypalWebhook({ headers: request.headers, rawBody: rawBodyResult.data, event });
  } catch (error) {
    logger.error('[donate/paypal] 回调验签异常', error);
    return NextResponse.json({ error: { code: 'VERIFY_FAILED', message: '回调验签失败' } }, { status: 502 });
  }

  if (!verified) {
    // 未配置 PAYPAL_WEBHOOK_ID 或验签不通过：一律拒绝，防止伪造通知
    logger.warn('[donate/paypal] 回调验签未通过或 Webhook ID 未配置');
    return NextResponse.json({ error: { code: 'VERIFY_FAILED', message: '回调验签失败' } }, { status: 400 });
  }

  if (event.event_type === 'PAYMENT.CAPTURE.COMPLETED') {
    await notifyDonationSuccess({
      channel: 'paypal',
      amountYuan: event.resource?.amount?.value
        ? `${event.resource.amount.value} ${event.resource.amount.currency_code ?? ''}`.trim()
        : undefined,
      orderId: event.resource?.custom_id ?? 'unknown',
    });
  }

  // 其余事件类型（ORDER.APPROVED、PAYMENT.CAPTURE.REFUNDED 等）确认收到即可
  return NextResponse.json({ received: true });
}
