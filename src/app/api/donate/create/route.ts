import { NextRequest, NextResponse } from 'next/server';

import { createDonationSchema } from '@/features/donate/schema';
import { createDonation, DonationGatewayError } from '@/features/donate/server';
import { readWechatOpenid } from '@/features/donate/server/wechat/oauth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: 'BAD_REQUEST', message: '请求体不是合法 JSON' } },
      { status: 400 },
    );
  }

  const parsed = createDonationSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          code: 'BAD_REQUEST',
          message: parsed.error.issues[0]?.message ?? '支付参数不合法',
        },
      },
      { status: 400 },
    );
  }

  // JSAPI 下单需要 openid，Cookie 由网页授权回调写入并做了 HMAC 校验
  const openid = readWechatOpenid(request.cookies.get('wx_openid')?.value);
  const userAgent = request.headers.get('user-agent') ?? '';
  const payerIp =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip')?.trim() ||
    '127.0.0.1';

  try {
    const result = await createDonation(parsed.data, { userAgent, openid, payerIp });
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof DonationGatewayError) {
      const status =
        error.code === 'GATEWAY_NOT_CONFIGURED'
          ? 503
          : error.code === 'GATEWAY_FAILED'
            ? 502
            : error.code === 'INVALID_ORDER'
              ? 404
              : error.code === 'WECHAT_OAUTH_REQUIRED'
                ? 401
                : 501;
      return NextResponse.json(
        { error: { code: error.code, message: error.message } },
        { status },
      );
    }

    return NextResponse.json(
      { error: { code: 'GATEWAY_FAILED', message: '下单失败，请稍后重试' } },
      { status: 502 },
    );
  }
}
