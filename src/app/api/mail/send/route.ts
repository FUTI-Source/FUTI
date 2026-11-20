import { NextResponse } from 'next/server';

import { checkMailRateLimit, sendContactMail } from '@/features/mail/server';
import { sendMailSchema } from '@/features/mail/schema';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_BODY_BYTES = 24 * 1024;

export async function POST(request: Request) {
  const clientId =
    request.headers.get('x-real-ip')?.trim() ||
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    'unknown';
  const rateLimit = checkMailRateLimit(clientId);

  if (!rateLimit.allowed) {
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

  const parsed = sendMailSchema.safeParse(raw);
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
    const result = await sendContactMail(parsed.data);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : '邮件发送失败，请稍后重试';
    return NextResponse.json(
      { error: { code: 'MAIL_FAILED', message } },
      { status: 502 },
    );
  }
}
