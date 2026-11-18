import { NextResponse } from 'next/server';

import { sendContactMail } from '@/lib/mailer';
import { sendMailSchema } from '@/lib/validations';

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
