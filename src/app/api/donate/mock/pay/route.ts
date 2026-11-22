import { NextResponse } from 'next/server';

import { isMockEnabled, setMockOrderStatus } from '@/features/donate/server/mock';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function notFound(): Response {
  return new Response('Not Found', {
    status: 404,
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}

export function GET(request: Request) {
  if (!isMockEnabled()) return notFound();

  const url = new URL(request.url);
  const orderId = url.searchParams.get('orderId')?.trim();
  const result = url.searchParams.get('result');

  if (!orderId || (result !== 'success' && result !== 'cancel')) {
    return new Response('Bad Request', {
      status: 400,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }

  const order = setMockOrderStatus(
    orderId,
    result === 'success' ? 'paid' : 'closed',
  );
  if (!order) return notFound();

  const target =
    result === 'success'
      ? `/?donate=success&orderId=${encodeURIComponent(orderId)}`
      : '/?donate=cancel';

  return NextResponse.redirect(new URL(target, url.origin), 303);
}
