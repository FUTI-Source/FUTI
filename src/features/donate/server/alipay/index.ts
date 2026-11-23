import type { DonationStatus } from '../../types';

import { buildGatewayUrl, formatTimestamp, signParams, verifyParams } from './crypto';

export class AlipayError extends Error {
  constructor(
    message: string,
    readonly code?: string,
  ) {
    super(message);
    this.name = 'AlipayError';
  }
}

export class AlipayNotifyError extends Error {
  constructor(
    message: string,
    readonly status: 400 | 401 | 500,
  ) {
    super(message);
    this.name = 'AlipayNotifyError';
  }
}

interface AlipayConfig {
  appId: string;
  privateKey: string;
  publicKey: string;
  gateway: string;
}

function getAlipayConfig(): AlipayConfig | null {
  const appId = process.env.ALIPAY_APP_ID?.trim();
  const privateKey = process.env.ALIPAY_PRIVATE_KEY?.trim();
  const publicKey = process.env.ALIPAY_PUBLIC_KEY?.trim();
  if (!appId || !privateKey || !publicKey) return null;

  return {
    appId,
    privateKey,
    publicKey,
    gateway: process.env.ALIPAY_GATEWAY?.trim() || 'https://openapi.alipay.com/gateway.do',
  };
}

function requireConfig(): AlipayConfig {
  const config = getAlipayConfig();
  if (!config) throw new AlipayError('支付宝支付尚未配置');
  return config;
}

interface AlipayResponse {
  code?: string;
  msg?: string;
  sub_code?: string;
  sub_msg?: string;
  [key: string]: unknown;
}

async function callAlipay<T extends AlipayResponse>(
  method: string,
  bizContent: Record<string, unknown>,
  options?: { notifyUrl?: string },
): Promise<T> {
  const config = requireConfig();
  const params: Record<string, string | undefined> = {
    app_id: config.appId,
    method,
    format: 'JSON',
    charset: 'utf-8',
    sign_type: 'RSA2',
    timestamp: formatTimestamp(),
    version: '1.0',
    notify_url: options?.notifyUrl,
    biz_content: JSON.stringify(bizContent),
  };

  const sign = signParams(params, config.privateKey);
  const body = new URLSearchParams();
  for (const [key, value] of Object.entries({ ...params, sign })) {
    if (value !== undefined && value !== '') body.set(key, value);
  }

  let response: Response;
  try {
    response = await fetch(config.gateway, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8' },
      body,
      cache: 'no-store',
    });
  } catch {
    throw new AlipayError('支付宝网关请求失败');
  }

  if (!response.ok) {
    throw new AlipayError(`支付宝网关响应异常 (HTTP ${response.status})`);
  }

  const text = await response.text();
  let json: Record<string, unknown>;
  try {
    json = JSON.parse(text) as Record<string, unknown>;
  } catch {
    throw new AlipayError('支付宝返回内容无法解析');
  }

  const responseKey = `${method.replace(/\./g, '_')}_response`;
  const payload = (json[responseKey] ?? json.error_response) as T | undefined;
  if (!payload) throw new AlipayError('支付宝返回结构异常');

  if (!payload.code || payload.code !== '10000') {
    const message = payload.sub_msg || payload.msg || '支付宝请求失败';
    throw new AlipayError(message, payload.sub_code || payload.code);
  }

  return payload;
}

function toYuan(amountFen: number): string {
  return (amountFen / 100).toFixed(2);
}

/** 当面付：预下单，返回二维码内容 */
export async function createAlipayPrecreateOrder(input: {
  orderId: string;
  amountFen: number;
  description: string;
  notifyUrl: string;
}): Promise<string> {
  const payload = await callAlipay<{ qr_code?: string }>(
    'alipay.trade.precreate',
    {
      out_trade_no: input.orderId,
      total_amount: toYuan(input.amountFen),
      subject: input.description,
      product_code: 'FACE_TO_FACE_PAYMENT',
      timeout_express: '30m',
    },
    { notifyUrl: input.notifyUrl },
  );

  if (!payload.qr_code) throw new AlipayError('支付宝未返回二维码');
  return payload.qr_code;
}

/** 手机网站支付：返回可直接跳转的收银台地址 */
export function createAlipayWapUrl(input: {
  orderId: string;
  amountFen: number;
  description: string;
  notifyUrl: string;
  returnUrl: string;
  quitUrl: string;
}): string {
  const config = requireConfig();

  return buildGatewayUrl({
    gateway: config.gateway,
    appId: config.appId,
    method: 'alipay.trade.wap.pay',
    privateKey: config.privateKey,
    notifyUrl: input.notifyUrl,
    returnUrl: input.returnUrl,
    bizContent: {
      out_trade_no: input.orderId,
      total_amount: toYuan(input.amountFen),
      subject: input.description,
      product_code: 'QUICK_WAP_WAY',
      quit_url: input.quitUrl,
    },
  });
}

const TRADE_STATE_MAP: Record<string, DonationStatus> = {
  TRADE_SUCCESS: 'paid',
  TRADE_FINISHED: 'paid',
  TRADE_CLOSED: 'closed',
  WAIT_BUYER_PAY: 'pending',
};

export async function queryAlipayOrder(orderId: string): Promise<{
  status: DonationStatus;
  transactionId?: string;
}> {
  const payload = await callAlipay<{ trade_status?: string; trade_no?: string }>(
    'alipay.trade.query',
    { out_trade_no: orderId },
  );

  return {
    status: TRADE_STATE_MAP[payload.trade_status ?? ''] ?? 'pending',
    transactionId: payload.trade_no,
  };
}

export interface AlipayNotifyPayload {
  outTradeNo: string;
  tradeNo?: string;
  tradeStatus: string;
  totalAmount: string;
  appId: string;
}

/** 校验异步通知签名并提取关键字段 */
export function parseAlipayNotify(params: Record<string, string>): AlipayNotifyPayload {
  const config = requireConfig();

  if (!verifyParams(params, config.publicKey)) {
    throw new AlipayNotifyError('签名验证失败', 401);
  }
  if (params.app_id !== config.appId) {
    throw new AlipayNotifyError('应用 ID 不匹配', 401);
  }

  const outTradeNo = params.out_trade_no?.trim();
  const tradeStatus = params.trade_status?.trim();
  const totalAmount = params.total_amount?.trim();
  if (!outTradeNo || !tradeStatus || !totalAmount) {
    throw new AlipayNotifyError('回调参数缺失', 400);
  }

  return {
    outTradeNo,
    tradeNo: params.trade_no,
    tradeStatus,
    totalAmount,
    appId: params.app_id,
  };
}
