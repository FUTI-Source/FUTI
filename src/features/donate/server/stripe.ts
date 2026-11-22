const STRIPE_API_BASE = 'https://api.stripe.com';

export class StripeError extends Error {
  constructor(
    message: string,
    readonly code?: string,
  ) {
    super(message);
    this.name = 'StripeError';
  }
}

export interface StripeConfig {
  secretKey: string;
  currency: string;
}

export function getStripeConfig(): StripeConfig | null {
  const secretKey = process.env.STRIPE_SECRET_KEY?.trim();
  if (!secretKey) return null;

  const currency = process.env.STRIPE_CURRENCY?.trim().toLowerCase() || 'cny';
  return { secretKey, currency };
}

async function stripeRequest<T>(path: string, body: URLSearchParams): Promise<T> {
  const config = getStripeConfig();
  if (!config) throw new StripeError('Stripe 尚未配置', 'GATEWAY_NOT_CONFIGURED');

  let response: Response;
  try {
    response = await fetch(`${STRIPE_API_BASE}${path}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.secretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
      cache: 'no-store',
    });
  } catch {
    throw new StripeError('无法连接 Stripe');
  }

  const data = (await response.json().catch(() => null)) as
    | (T & { error?: { message?: string; code?: string } })
    | null;

  if (!response.ok) {
    throw new StripeError(
      data?.error?.message ?? `Stripe 接口返回 ${response.status}`,
      data?.error?.code ?? 'STRIPE_FAILED',
    );
  }

  if (!data) throw new StripeError('Stripe 返回内容为空');
  return data;
}

/** 创建 Stripe 托管收银台，Apple Pay / Google Pay 由收银台按环境展示 */
export async function createStripeCheckoutSession(input: {
  amountFen: number;
  channel: 'applepay' | 'googlepay';
  description: string;
  successUrl: string;
  cancelUrl: string;
}): Promise<string> {
  const config = getStripeConfig();
  if (!config) throw new StripeError('Stripe 尚未配置', 'GATEWAY_NOT_CONFIGURED');

  const body = new URLSearchParams({
    mode: 'payment',
    success_url: input.successUrl,
    cancel_url: input.cancelUrl,
    'payment_method_types[0]': 'card',
    'line_items[0][quantity]': '1',
    'line_items[0][price_data][currency]': config.currency,
    'line_items[0][price_data][unit_amount]': String(input.amountFen),
    'line_items[0][price_data][product_data][name]': input.description,
    'metadata[channel]': input.channel,
  });

  const session = await stripeRequest<{ id?: string; url?: string | null }>(
    '/v1/checkout/sessions',
    body,
  );

  if (!session.url) throw new StripeError('Stripe 未返回支付地址');
  return session.url;
}
