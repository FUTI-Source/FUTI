import { NextResponse } from 'next/server';

import { donateChannelSchema } from '@/features/donate/schema';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ channel: string }> },
) {
  const { channel } = await params;

  if (!donateChannelSchema.safeParse(channel).success) {
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: '未知的支付渠道' } },
      { status: 404 },
    );
  }

  // TODO 接入回调时必须先验签，再按订单号幂等更新状态；
  // 验签失败或金额不一致的请求一律拒绝，且不能信任请求体中的任何金额字段。
  void request;

  return NextResponse.json(
    { error: { code: 'NOT_IMPLEMENTED', message: '支付回调尚未接入' } },
    { status: 501 },
  );
}
