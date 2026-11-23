import { NextResponse } from 'next/server';

import { donateChannelSchema } from '@/features/donate/schema';
import { notifyDonationSuccess } from '@/features/donate/server/notify';
import { AlipayNotifyError, parseAlipayNotify } from '@/features/donate/server/alipay';
import { WechatNotifyError, parseWechatNotify } from '@/features/donate/server/wechat';

/**
 * 无状态模式：回调只做验签（微信额外解密），确认收到即可。
 * 支付结果由前端携带签名令牌向支付宝/微信查单确认，无需落库。
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** 回调体很小，超过该长度直接拒绝 */
const MAX_NOTIFY_BODY_BYTES = 64 * 1024;

type NotifyChannel = 'alipay' | 'wechat';

/**
 * 两个渠道对“处理失败”的应答格式不同：
 * 支付宝只看 body 是否为 failure，微信要求 JSON 的 code。
 */
function channelFailure(channel: NotifyChannel, message: string, status: number) {
  return channel === 'alipay'
    ? new Response('failure', { status })
    : NextResponse.json({ code: 'FAIL', message }, { status });
}

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

  // 先校验 Content-Length 头，避免超大 body 被完整读入内存后才拦截
  const contentLength = Number(request.headers.get('content-length'));
  if (Number.isFinite(contentLength) && contentLength > MAX_NOTIFY_BODY_BYTES) {
    return channelFailure(notifyChannel, '请求体过大', 400);
  }

  const rawBody = await request.text();
  if (Buffer.byteLength(rawBody, 'utf8') > MAX_NOTIFY_BODY_BYTES) {
    return channelFailure(notifyChannel, '请求体过大', 400);
  }

  if (notifyChannel === 'alipay') {
    const notifyParams: Record<string, string> = {};
    new URLSearchParams(rawBody).forEach((value, key) => {
      notifyParams[key] = value;
    });

    try {
      // 验签与校验应用信息；支付状态由前端查单确认
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
        console.error('[donate] 支付宝回调失败：', error.message);
        return new Response('failure', { status: error.status });
      }

      console.error('[donate] 支付宝回调异常', error);
      return new Response('failure', { status: 500 });
    }
  }

  try {
    // 验签与解密，失败即返回非 2xx 让微信重试；支付状态由前端查单确认
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
      console.error('[donate] 微信支付回调失败：', error.message);
      return NextResponse.json(
        { code: 'FAIL', message: error.status === 401 ? '签名验证失败' : '处理失败' },
        { status: error.status },
      );
    }

    console.error('[donate] 微信支付回调异常', error);
    return NextResponse.json({ code: 'FAIL', message: '处理失败' }, { status: 500 });
  }
}
