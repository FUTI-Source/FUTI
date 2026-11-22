import { NextResponse } from 'next/server';

import { DonationGatewayError, queryDonation } from '@/features/donate/server';
import { isMockEnabled } from '@/features/donate/server/mock';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export function GET(request: Request) {
  if (!isMockEnabled()) {
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: '接口不存在' } },
      { status: 404 },
    );
  }

  const orderId = new URL(request.url).searchParams.get('orderId')?.trim();
  if (!orderId) {
    return NextResponse.json(
      { error: { code: 'BAD_REQUEST', message: '缺少订单号' } },
      { status: 400 },
    );
  }

  try {
    return NextResponse.json(queryDonation(orderId));
  } catch (error) {
    if (error instanceof DonationGatewayError) {
      const status = error.code === 'INVALID_ORDER' ? 404 : 502;
      return NextResponse.json(
        { error: { code: error.code, message: error.message } },
        { status },
      );
    }

    return NextResponse.json(
      { error: { code: 'GATEWAY_FAILED', message: '查询订单失败' } },
      { status: 502 },
    );
  }
}
