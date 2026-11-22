import { NextResponse } from 'next/server';

import { DonationGatewayError, queryDonation } from '@/features/donate/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const orderId = new URL(request.url).searchParams.get('orderId')?.trim();
  if (!orderId) {
    return NextResponse.json(
      { error: { code: 'BAD_REQUEST', message: '缺少订单号' } },
      { status: 400 },
    );
  }

  try {
    const result = await queryDonation(orderId);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof DonationGatewayError) {
      return NextResponse.json(
        { error: { code: error.code, message: error.message } },
        { status: 501 },
      );
    }

    return NextResponse.json(
      { error: { code: 'GATEWAY_FAILED', message: '查询订单失败，请稍后重试' } },
      { status: 502 },
    );
  }
}
