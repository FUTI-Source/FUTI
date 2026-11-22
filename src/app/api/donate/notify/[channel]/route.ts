import { NextResponse } from 'next/server';

import { donateChannelSchema } from '@/features/donate/schema';
import { AlipayNotifyError } from '@/features/donate/server/alipay';
import { handleAlipayNotify } from '@/features/donate/server/alipay/notify';
import { WechatNotifyError } from '@/features/donate/server/wechat';
import { handleWechatNotify } from '@/features/donate/server/wechat/notify';

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

  const rawBody = await request.text();
  if (Buffer.byteLength(rawBody, 'utf8') > MAX_NOTIFY_BODY_BYTES) {
    return parsedChannel.data === 'alipay'
      ? new Response('failure', { status: 400 })
      : NextResponse.json({ code: 'FAIL', message: '请求体过大' }, { status: 400 });
  }

  if (parsedChannel.data === 'alipay') {
    const notifyParams: Record<string, string> = {};
    new URLSearchParams(rawBody).forEach((value, key) => {
      notifyParams[key] = value;
    });

    try {
      // 验签与校验应用信息；支付状态由前端查单确认
      await handleAlipayNotify(notifyParams);
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
    await handleWechatNotify(request.headers, rawBody);
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
