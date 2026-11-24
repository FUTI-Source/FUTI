import { NextResponse } from 'next/server';

import { donateChannelSchema } from '@/features/donate/schema';
import { notifyDonationSuccess } from '@/features/donate/server/notice';
import { AlipayNotifyError, parseAlipayNotify } from '@/features/donate/server/alipay';
import { WechatNotifyError, parseWechatNotify } from '@/features/donate/server/wechat';
import { readRawBody } from '@/lib/http/api-response';
import { logger } from '@/lib/logger';

/**
 * 无状态模式：回调只做验签（微信额外解密），确认收到即可。
 * 支付结果由前端携带签名令牌向支付宝/微信查单确认，无需落库。
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** 回调体很小，超过该长度直接拒绝 */
const MAX_NOTIFY_BODY_BYTES = 64 * 1024;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ channel: string }> },
) {
  const { channel } = await params;

  const parsedChannel = donateChannelSchema.safeParse(channel);
  if (!parsedChannel.success) {
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: '未知的支付渠道' } },
      { status: 404 },
    );
  }

  const notifyChannel = parsedChannel.data;

  const rawBodyResult = await readRawBody(request, MAX_NOTIFY_BODY_BYTES);
  if (!rawBodyResult.ok) {
    // readRawBody returns a NextResponse; for alipay we need to return plain 'failure'
    if (notifyChannel === 'alipay') {
      return new Response('failure', { status: rawBodyResult.response.status });
    }
    return rawBodyResult.response;
  }
  const rawBody = rawBodyResult.data;

  if (notifyChannel === 'alipay') {
    const notifyParams: Record<string, string> = {};
    new URLSearchParams(rawBody).forEach((value, key) => {
      notifyParams[key] = value;
    });

    try {
      const event = parseAlipayNotify(notifyParams);
      if (event.tradeStatus === 'TRADE_SUCCESS' || event.tradeStatus === 'TRADE_FINISHED') {
        await notifyDonationSuccess({
          channel: 'alipay',
          amountYuan: event.totalAmount,
          orderId: event.outTradeNo,
        });
      }
      return new Response('success', {
        status: 200,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    } catch (error) {
      if (error instanceof AlipayNotifyError) {
        logger.error('[donate] 支付宝回调失败', error.message);
        return new Response('failure', { status: error.status });
      }
      logger.error('[donate] 支付宝回调异常', error);
      return new Response('failure', { status: 500 });
    }
  }

  try {
    const event = parseWechatNotify(request.headers, rawBody);
    if (event.tradeState === 'SUCCESS') {
      await notifyDonationSuccess({
        channel: 'wechat',
        amountYuan:
          typeof event.amountTotal === 'number' ? (event.amountTotal / 100).toFixed(2) : undefined,
        orderId: event.outTradeNo,
      });
    }
    return NextResponse.json({ code: 'SUCCESS', message: '成功' });
  } catch (error) {
    if (error instanceof WechatNotifyError) {
      logger.error('[donate] 微信支付回调失败', error.message);
      return NextResponse.json(
        { code: 'FAIL', message: error.status === 401 ? '签名验证失败' : '处理失败' },
        { status: error.status },
      );
    }
    logger.error('[donate] 微信支付回调异常', error);
    return NextResponse.json({ code: 'FAIL', message: '处理失败' }, { status: 500 });
  }
}
