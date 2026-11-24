import { NextRequest, NextResponse } from 'next/server';

import { createDonationSchema } from '@/features/donate/schema';
import { createDonation, DonationGatewayError } from '@/features/donate/server';
import { readWechatOpenid } from '@/features/donate/server/wechat/oauth';
import { resolveClientId } from '@/lib/http/client-ip';
import { donateCreateRateLimiter } from '@/lib/http/rate-limit';
import { jsonError, rateLimited, readJsonBody } from '@/lib/http/api-response';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_BODY_BYTES = 8 * 1024;

function donationErrorResponse(error: DonationGatewayError) {
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
  return jsonError(status, error.code, error.message);
}

export async function POST(request: NextRequest) {
  const clientId = resolveClientId(request.headers);
  if (clientId) {
    const rateLimit = donateCreateRateLimiter.check(clientId);
    if (!rateLimit.allowed) return rateLimited(rateLimit, '下单过于频繁，请稍后再试');
  }

  const body = await readJsonBody(request, MAX_BODY_BYTES);
  if (!body.ok) return body.response;

  const parsed = createDonationSchema.safeParse(body.data);
  if (!parsed.success) {
    return jsonError(400, 'BAD_REQUEST', parsed.error.issues[0]?.message ?? '支付参数不合法');
  }

  const openid = readWechatOpenid(request.cookies.get('wx_openid')?.value);
  const userAgent = request.headers.get('user-agent') ?? '';
  const payerIp = clientId ?? '127.0.0.1';

  try {
    const result = await createDonation(parsed.data, { userAgent, openid, payerIp });
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof DonationGatewayError) {
      logger.warn('[donate] 下单失败', { code: error.code, message: error.message });
      return donationErrorResponse(error);
    }
    logger.error('[donate] 下单异常', error);
    return jsonError(502, 'GATEWAY_FAILED', '下单失败，请稍后重试');
  }
}
