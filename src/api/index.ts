import type { SendMailResponse } from '@/types/mail';

interface ApiError {
  response?: {
    data?: unknown;
  };
}

export async function sendMail(
  email: string,
  content: string,
): Promise<SendMailResponse> {
  const response = await fetch('/api/mail/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, content }),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const error: ApiError = { response: { data } };
    throw error;
  }

  return data as SendMailResponse;
}
