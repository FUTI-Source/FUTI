import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { notifyDonationSuccess } from '@/features/donate/server/notice';
import { capturePaypalOrder, PayPalError } from '@/features/donate/server/paypal';
import { resolveClientId } from '@/lib/http/client-ip';
import { donateCreateRateLimiter } from '@/lib/http/rate-limit';
import { jsonError, rateLimited, readJsonBody } from '@/lib/http/api-response';
import { logger } from '@/lib/logger';
import { PAYPAL_CURRENCY } from '@/config/site';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_BODY_BYTES = 4 * 1024;

const captureSchema = z.object({
  paypalOrderId: z.string().min(6).max(64),
});

export async function POST(request: NextRequest) {
  const clientId = resolveClientId(request.headers);
  if (clientId) {
    const rateLimit = donateCreateRateLimiter.check(clientId);
    if (!rateLimit.allowed) return rateLimited(rateLimit, '操作过于频繁，请稍后再试');
  }

  const body = await readJsonBody(request, MAX_BODY_BYTES);
  if (!body.ok) return body.response;

  const parsed = captureSchema.safeParse(body.data);
  if (!parsed.success) {
    return jsonError(400, 'BAD_REQUEST', '支付参数不合法');
  }

  let result;
  try {
    result = await capturePaypalOrder(parsed.data.paypalOrderId);
  } catch (error) {
    if (error instanceof PayPalError) {
      logger.warn('[donate/paypal] 扣款失败', error.message);
      return jsonError(error.status, 'GATEWAY_FAILED', error.message);
    }
    logger.error('[donate/paypal] 扣款异常', error);
    return jsonError(502, 'GATEWAY_FAILED', '确认支付失败，请稍后重试');
  }

  if (result.captureStatus !== 'COMPLETED') {
    // INSTRUMENT_DECLINED 等情况：PayPal 侧未扣款，让用户换支付方式重试
    logger.warn('[donate/paypal] 扣款未完成', {
      paypalOrderId: parsed.data.paypalOrderId,
      orderStatus: result.orderStatus,
      captureStatus: result.captureStatus,
    });
    return jsonError(402, 'PAYMENT_FAILED', '支付未完成，请更换支付方式后重试');
  }

  // capture 成功即视为支付完成，同步发出成功通知；webhook 重复通知由去重逻辑吸收
  await notifyDonationSuccess({
    channel: 'paypal',
    amountYuan: result.amountValue
      ? `${result.amountValue} ${result.amountCurrency ?? PAYPAL_CURRENCY}`
      : undefined,
    orderId: result.customId ?? parsed.data.paypalOrderId,
  });

  return NextResponse.json(
    { orderId: result.customId ?? '', status: 'paid' },
    { status: 200 },
  );
}
