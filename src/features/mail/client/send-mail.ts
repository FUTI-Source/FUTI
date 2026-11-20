import type { SendMailInput } from '../schema';
import type { MailErrorBody, SendMailResponse } from '../types';

export class SendMailError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
  ) {
    super(message);
    this.name = 'SendMailError';
  }
}

export async function sendMail(input: SendMailInput): Promise<SendMailResponse> {
  const response = await fetch('/api/mail/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const error = (data as MailErrorBody | null)?.error;
    throw new SendMailError(
      error?.message ?? '发送失败，请稍后重试',
      response.status,
      error?.code,
    );
  }

  return data as SendMailResponse;
}
