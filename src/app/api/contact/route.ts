import { NextResponse } from 'next/server';

import { sendContactNotice } from '@/features/contact/server';
import { contactSchema } from '@/features/contact/schema';
import { resolveClientId } from '@/lib/http/client-ip';
import { contactRateLimiter } from '@/lib/http/rate-limit';
import { jsonError, rateLimited, readJsonBody } from '@/lib/http/api-response';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_BODY_BYTES = 24 * 1024;

let warnedMissingClientId = false;

export async function POST(request: Request) {
  const clientId = resolveClientId(request.headers);

  if (!clientId && !warnedMissingClientId) {
    warnedMissingClientId = true;
    logger.warn('[contact] 未能解析客户端 IP，本次跳过限流');
  }

  const rateLimit = clientId ? contactRateLimiter.check(clientId) : { allowed: true, retryAfterSeconds: 0 };
  if (!rateLimit.allowed) return rateLimited(rateLimit);

  const body = await readJsonBody(request, MAX_BODY_BYTES);
  if (!body.ok) return body.response;

  const parsed = contactSchema.safeParse(body.data);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return jsonError(400, 'BAD_REQUEST', firstIssue?.message ?? '邮箱或内容不合法');
  }

  try {
    const result = await sendContactNotice(parsed.data);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    logger.error('[contact] 通知投递失败', error);
    return jsonError(502, 'NOTIFY_FAILED', '通知发送失败，请稍后重试');
  }
}
