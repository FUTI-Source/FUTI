import { NextResponse } from 'next/server';

import { checkContactRateLimit, sendContactWebhook } from '@/features/contact/server';
import { contactSchema } from '@/features/contact/schema';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_BODY_BYTES = 24 * 1024;

/**
 * 解析真实客户端 IP。
 * CDN/边缘节点常把 x-real-ip 写成节点自身地址，所有访客会共用同一个限流桶，
 * 因此优先取 x-forwarded-for 的第一个地址；都取不到时返回 null，跳过限流而不是全局误伤。
 */
function resolveClientId(request: Request): string | null {
  const forwarded = request.headers.get('x-forwarded-for');
  const candidates = [
    forwarded?.split(',')[0],
    request.headers.get('x-real-ip'),
    request.headers.get('x-client-ip'),
    request.headers.get('true-client-ip'),
  ];

  for (const value of candidates) {
    const clientId = value?.trim();
    if (clientId && clientId !== 'unknown') return clientId;
  }

  return null;
}

let loggedMissingClientId = false;

/** 临时诊断：确认 IGA 实际透传了哪些客户端 IP 头，定位完成后移除。 */
function logClientIpContext(reason: string, request: Request, clientId: string | null) {
  const read = (name: string) => request.headers.get(name);

  console.warn('[contact-rate-limit]', reason, {
    clientId,
    forwardedFor: read('x-forwarded-for'),
    realIp: read('x-real-ip'),
    clientIp: read('x-client-ip'),
    trueClientIp: read('true-client-ip'),
    userAgent: read('user-agent')?.slice(0, 120) ?? null,
  });
}

export async function POST(request: Request) {
  const clientId = resolveClientId(request);
  if (!clientId && !loggedMissingClientId) {
    loggedMissingClientId = true;
    logClientIpContext('missing-client-ip', request, clientId);
  }

  const rateLimit = clientId
    ? checkContactRateLimit(clientId)
    : { allowed: true, retryAfterSeconds: 0 };

  if (!rateLimit.allowed) {
    logClientIpContext('rate-limited', request, clientId);
    return NextResponse.json(
      {
        error: {
          code: 'RATE_LIMITED',
          message: '提交过于频繁，请稍后再试',
        },
      },
      {
        status: 429,
        headers: { 'Retry-After': String(rateLimit.retryAfterSeconds) },
      },
    );
  }

  const contentLength = Number(request.headers.get('content-length'));
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
    return NextResponse.json(
      { error: { code: 'PAYLOAD_TOO_LARGE', message: '请求内容过大' } },
      { status: 413 },
    );
  }

  let body: string;
  try {
    body = await request.text();
  } catch {
    return NextResponse.json(
      { error: { code: 'BAD_REQUEST', message: '请求体不是合法 JSON' } },
      { status: 400 },
    );
  }

  if (new TextEncoder().encode(body).byteLength > MAX_BODY_BYTES) {
    return NextResponse.json(
      { error: { code: 'PAYLOAD_TOO_LARGE', message: '请求内容过大' } },
      { status: 413 },
    );
  }

  let raw: unknown;
  try {
    raw = JSON.parse(body);
  } catch {
    return NextResponse.json(
      { error: { code: 'BAD_REQUEST', message: '请求体不是合法 JSON' } },
      { status: 400 },
    );
  }

  const parsed = contactSchema.safeParse(raw);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return NextResponse.json(
      {
        error: {
          code: 'BAD_REQUEST',
          message: firstIssue?.message ?? '邮箱或内容不合法',
        },
      },
      { status: 400 },
    );
  }

  try {
    const result = await sendContactWebhook(parsed.data);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    // 真实原因（含 webhook 响应体）只记服务端日志，避免向访客泄露内部细节；
    // 站长可通过 `iga pages logs` 查看。访客统一看到友好提示。
    console.error('[contact] webhook 投递失败', error);
    return NextResponse.json(
      { error: { code: 'NOTIFY_FAILED', message: '通知发送失败，请稍后重试' } },
      { status: 502 },
    );
  }
}
