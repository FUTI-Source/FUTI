import { NextResponse } from 'next/server';

import { DonationGatewayError, queryDonation } from '@/features/donate/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get('token')?.trim();
  if (!token) {
    return NextResponse.json(
      { error: { code: 'BAD_REQUEST', message: '缺少订单令牌' } },
      { status: 400 },
    );
  }

  try {
    const result = await queryDonation(token);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof DonationGatewayError) {
      const status =
        error.code === 'INVALID_ORDER' ? 404 : error.code === 'GATEWAY_FAILED' ? 502 : 501;
      return NextResponse.json(
        { error: { code: error.code, message: error.message } },
        { status },
      );
    }

    return NextResponse.json(
      { error: { code: 'GATEWAY_FAILED', message: '查询订单失败，请稍后重试' } },
      { status: 502 },
    );
  }
}
