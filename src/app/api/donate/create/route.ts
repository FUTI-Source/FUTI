import { NextResponse } from 'next/server';

import { createDonationSchema } from '@/features/donate/schema';
import { createDonation, DonationGatewayError } from '@/features/donate/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
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

  try {
    const result = await createDonation(parsed.data);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof DonationGatewayError) {
      return NextResponse.json(
        { error: { code: error.code, message: error.message } },
        { status: error.code === 'GATEWAY_NOT_CONFIGURED' ? 503 : 501 },
      );
    }

    return NextResponse.json(
      { error: { code: 'GATEWAY_FAILED', message: '下单失败，请稍后重试' } },
      { status: 502 },
    );
  }
}
