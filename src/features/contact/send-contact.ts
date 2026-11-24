import type { ContactInput } from './schema';
import type { ApiErrorBody, ContactResponse } from './types';

export class ContactError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
  ) {
    super(message);
    this.name = 'ContactError';
  }
}

export async function sendContact(input: ContactInput): Promise<ContactResponse> {
  const response = await fetch('/api/contact', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const error = (data as ApiErrorBody | null)?.error;
    throw new ContactError(
      error?.message ?? '提交失败，请稍后重试',
      response.status,
      error?.code,
    );
  }

  return data as ContactResponse;
}
