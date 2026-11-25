import { getPaypalEnv, type PaypalEnv } from '@/config/env';
import { logger } from '@/lib/logger';

import { PAYPAL_CURRENCY } from '@/config/site';

/**
 * PayPal Orders API v2（REST）的最小封装：下单、扣款、查单、Webhook 验签。
 *
 * 与微信 / 支付宝模块并列的第三条渠道；金额单位是 PayPal 币种（默认 USD），
 * 与人民币渠道互不换算，档位见 src/config/site 的 PAYPAL_*。
 */

const API_BASE = {
  sandbox: 'https://api-m.sandbox.paypal.com',
  live: 'https://api-m.paypal.com',
} as const;

export class PayPalError extends Error {
  constructor(
    message: string,
    public readonly status = 502,
  ) {
    super(message);
    this.name = 'PayPalError';
  }
}

/** PayPal 是否已配置（前端据此决定渠道可用性） */
export const isPaypalConfigured = (): boolean => getPaypalEnv() !== null;

/** PayPal 收款币种（来自 src/config/site） */
export const getPaypalCurrency = (): string => PAYPAL_CURRENCY;

/* ------------------------------ 访问令牌 ------------------------------ */

let tokenCache: { value: string; expiresAt: number } | null = null;

async function getAccessToken(env: PaypalEnv): Promise<string> {
  if (tokenCache && Date.now() < tokenCache.expiresAt - 60_000) {
    return tokenCache.value;
  }

  const auth = Buffer.from(`${env.clientId}:${env.clientSecret}`).toString('base64');
  let response: Response;
  try {
    response = await fetch(`${API_BASE[env.env]}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });
  } catch (error) {
    logger.error('[donate/paypal] 访问令牌请求失败', error);
    throw new PayPalError('PayPal 网络异常，请稍后重试');
  }

  if (!response.ok) {
    throw new PayPalError('PayPal 授权失败，请检查 PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET', 503);
  }

  const data = (await response.json()) as { access_token: string; expires_in: number };
  tokenCache = { value: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 };
  return data.access_token;
}

async function paypalRequest<T>(
  env: PaypalEnv,
  path: string,
  init?: { method?: string; body?: string },
): Promise<T> {
  const token = await getAccessToken(env);
  let response: Response;
  try {
    response = await fetch(`${API_BASE[env.env]}${path}`, {
      method: init?.method ?? 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: init?.body,
    });
  } catch (error) {
    logger.error('[donate/paypal] 网关请求失败', error);
    throw new PayPalError('PayPal 网络异常，请稍后重试');
  }

  const data = (await response.json().catch(() => null)) as
    | (T & { message?: string; details?: Array<{ issue?: string }> })
    | null;

  if (!response.ok) {
    const issue = data?.details?.[0]?.issue;
    throw new PayPalError(issue || data?.message || 'PayPal 请求失败，请稍后重试');
  }

  return data as T;
}

/* ------------------------------ 下单 ------------------------------ */

export interface CreatePaypalOrderInput {
  /** 本站订单号，写入 purchase_unit 的 custom_id，回调 / capture 时据此还原 */
  orderId: string;
  /** 金额，PayPal 币种单位，最多 2 位小数 */
  amount: number;
  currency: string;
  description: string;
  returnUrl: string;
  cancelUrl: string;
}

interface PaypalOrderResponse {
  id?: string;
  status?: string;
  purchase_units?: Array<{
    custom_id?: string;
    amount?: { value?: string; currency_code?: string };
    payments?: {
      captures?: Array<{
        id?: string;
        status?: string;
        custom_id?: string;
        amount?: { value?: string; currency_code?: string };
      }>;
    };
  }>;
}

export async function createPaypalOrder(input: CreatePaypalOrderInput): Promise<string> {
  const env = getPaypalEnv();
  if (!env) throw new PayPalError('PayPal 尚未配置', 503);

  const data = await paypalRequest<PaypalOrderResponse>(env, '/v2/checkout/orders', {
    method: 'POST',
    body: JSON.stringify({
      intent: 'CAPTURE',
      purchase_units: [
        {
          custom_id: input.orderId,
          description: input.description,
          amount: { currency_code: input.currency, value: input.amount.toFixed(2) },
        },
      ],
      application_context: {
        return_url: input.returnUrl,
        cancel_url: input.cancelUrl,
        shipping_preference: 'NO_SHIPPING',
        user_action: 'PAY_NOW',
      },
    }),
  });

  if (!data.id) throw new PayPalError('PayPal 下单失败，请稍后重试');
  return data.id;
}

/* ------------------------------ 扣款 / 查单 ------------------------------ */

export interface PaypalCaptureResult {
  orderStatus: string;
  captureId?: string;
  captureStatus?: string;
  /** 本站订单号（purchase_unit 的 custom_id） */
  customId?: string;
  amountValue?: string;
  amountCurrency?: string;
}

export async function capturePaypalOrder(paypalOrderId: string): Promise<PaypalCaptureResult> {
  const env = getPaypalEnv();
  if (!env) throw new PayPalError('PayPal 尚未配置', 503);

  const data = await paypalRequest<PaypalOrderResponse>(
    env,
    `/v2/checkout/orders/${encodeURIComponent(paypalOrderId)}/capture`,
    { method: 'POST' },
  );

  const capture = data.purchase_units?.[0]?.payments?.captures?.[0];
  return {
    orderStatus: data.status ?? '',
    captureId: capture?.id,
    captureStatus: capture?.status,
    customId: capture?.custom_id ?? data.purchase_units?.[0]?.custom_id,
    amountValue: capture?.amount?.value,
    amountCurrency: capture?.amount?.currency_code,
  };
}

export interface PaypalOrderQueryResult {
  status: 'pending' | 'paid' | 'refunded' | 'closed';
  /** 金额换算成最小货币单位（美分），与令牌记录交叉校验 */
  amountCents?: number;
}

export async function queryPaypalOrder(paypalOrderId: string): Promise<PaypalOrderQueryResult> {
  const env = getPaypalEnv();
  if (!env) throw new PayPalError('PayPal 尚未配置', 503);

  const data = await paypalRequest<PaypalOrderResponse>(
    env,
    `/v2/checkout/orders/${encodeURIComponent(paypalOrderId)}`,
  );

  const capture = data.purchase_units?.[0]?.payments?.captures?.[0];
  const value = capture?.amount?.value ?? data.purchase_units?.[0]?.amount?.value;

  let status: PaypalOrderQueryResult['status'] = 'pending';
  if (capture?.status === 'REFUNDED' || capture?.status === 'PARTIALLY_REFUNDED') {
    status = 'refunded';
  } else if (data.status === 'COMPLETED') {
    status = 'paid';
  } else if (data.status === 'VOIDED') {
    status = 'closed';
  }

  return {
    status,
    amountCents: value !== undefined ? Math.round(Number(value) * 100) : undefined,
  };
}

/* ------------------------------ Webhook 验签 ------------------------------ */

/**
 * 用 PayPal 官方验签接口校验回调真实性。
 * 未配置 PAYPAL_WEBHOOK_ID 时返回 false（调用方据此拒绝处理）。
 */
export async function verifyPaypalWebhook(input: {
  headers: Headers;
  rawBody: string;
  event: unknown;
}): Promise<boolean> {
  const env = getPaypalEnv();
  if (!env?.webhookId) return false;

  const {
    'paypal-auth-algo': authAlgo,
    'paypal-cert-url': certUrl,
    'paypal-transmission-id': transmissionId,
    'paypal-transmission-sig': transmissionSig,
    'paypal-transmission-time': transmissionTime,
  } = Object.fromEntries(input.headers.entries());

  const data = await paypalRequest<{ verification_status?: string }>(
    env,
    '/v1/notifications/verify-webhook-signature',
    {
      method: 'POST',
      body: JSON.stringify({
        auth_algo: authAlgo,
        cert_url: certUrl,
        transmission_id: transmissionId,
        transmission_sig: transmissionSig,
        transmission_time: transmissionTime,
        webhook_id: env.webhookId,
        webhook_event: input.event,
      }),
    },
  );

  return data.verification_status === 'SUCCESS';
}
