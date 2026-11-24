import { NextResponse } from 'next/server';

import { getDonateChannelConfig, getPaypalClientId, isWechatJsapiConfigured } from '@/features/donate/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export function GET() {
  return NextResponse.json({
    channels: getDonateChannelConfig(),
    wechatJsapi: isWechatJsapiConfigured(),
    paypalClientId: getPaypalClientId(),
  });
}
