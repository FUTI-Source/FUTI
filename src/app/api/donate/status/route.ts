import { NextResponse } from 'next/server';

import { DonationGatewayError, queryDonation } from '@/features/donate/server';
import { resolveClientId } from '@/lib/http/client-ip';
import { donateStatusRateLimiter } from '@/lib/http/rate-limit';
import { jsonError, rateLimited } from '@/lib/http/api-response';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get('token')?.trim();
  if (!token) {
    return jsonError(400, 'BAD_REQUEST', '缺少订单令牌');
  }

  // 按令牌限流：同一笔订单的轮询频率受控，防止令牌被滥用为打网关的放大器
  const clientId = resolveClientId(request.headers) ?? `token:${token.slice(0, 16)}`;
  const rateLimit = donateStatusRateLimiter.check(clientId);
  if (!rateLimit.allowed) return rateLimited(rateLimit, '查询过于频繁，请稍后再试');

  try {
    const result = await queryDonation(token);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof DonationGatewayError) {
      const status =
        error.code === 'INVALID_ORDER' ? 404 : error.code === 'GATEWAY_FAILED' ? 502 : 501;
      logger.warn('[donate] 查单失败', { code: error.code, message: error.message });
      return jsonError(status, error.code, error.message);
    }
    logger.error('[donate] 查单异常', error);
    return jsonError(502, 'GATEWAY_FAILED', '查询订单失败，请稍后重试');
  }
}
