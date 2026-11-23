import { randomBytes } from 'node:crypto';

import { SITE_USER_AGENT } from '../../../../lib/site';
import type { DonationStatus, WechatJsapiPaymentParams } from '../../types';
import {
  buildAuthorization,
  decryptNotifyResource,
  signMessage,
  verifyNotifySignature,
  type WechatNotifyResource,
} from './crypto';

const WECHAT_API_BASE = 'https://api.mch.weixin.qq.com';

export class WechatPayError extends Error {
  constructor(
    message: string,
    public readonly code = 'WECHAT_PAY_FAILED',
  ) {
    super(message);
    this.name = 'WechatPayError';
  }
}

export class WechatNotifyError extends Error {
  constructor(
    message: string,
    /**
     * 401：签名/密钥问题，微信视为投递失败；
     * 500：业务处理失败，微信会按策略重试。
     */
    public readonly status: 401 | 500 = 500,
  ) {
    super(message);
    this.name = 'WechatNotifyError';
  }
}

interface WechatPayConfig {
  mchId: string;
  appId: string;
  apiV3Key: string;
  serialNo: string;
  privateKey: string;
  publicKeyId: string;
  publicKey: string;
}

function getWechatPayConfig(): WechatPayConfig | null {
  const mchId = process.env.WECHAT_MCH_ID?.trim();
  const appId = process.env.WECHAT_APP_ID?.trim();
  const apiV3Key = process.env.WECHAT_API_V3_KEY?.trim();
  const serialNo = process.env.WECHAT_CERT_SERIAL_NO?.trim();
  const privateKey = process.env.WECHAT_PRIVATE_KEY?.trim();
  const publicKeyId = process.env.WECHAT_PUBLIC_KEY_ID?.trim();
  const publicKey = process.env.WECHAT_PUBLIC_KEY?.trim();

  if (!mchId || !appId || !apiV3Key || !serialNo || !privateKey || !publicKeyId || !publicKey) {
    return null;
  }

  return { mchId, appId, apiV3Key, serialNo, privateKey, publicKeyId, publicKey };
}

async function wechatRequest<T>(
  method: 'GET' | 'POST',
  urlPath: string,
  body?: unknown,
): Promise<T> {
  const config = getWechatPayConfig();
  if (!config) throw new WechatPayError('微信支付尚未配置', 'GATEWAY_NOT_CONFIGURED');

  const rawBody = body === undefined ? '' : JSON.stringify(body);
  const response = await fetch(`${WECHAT_API_BASE}${urlPath}`, {
    method,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'User-Agent': SITE_USER_AGENT,
      Authorization: buildAuthorization({
        mchId: config.mchId,
        serialNo: config.serialNo,
        privateKey: config.privateKey,
        method,
        urlPath,
        body: rawBody,
      }),
    },
    body: rawBody || undefined,
    cache: 'no-store',
  });

  const text = await response.text();
  let data: unknown = {};
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      throw new WechatPayError(`微信支付返回了无法解析的响应（HTTP ${response.status}）`);
    }
  }

  if (!response.ok) {
    const detail = data as { code?: string; message?: string };
    throw new WechatPayError(
      detail.message ?? `微信支付接口返回 ${response.status}`,
      detail.code ?? 'WECHAT_PAY_FAILED',
    );
  }

  return data as T;
}

/** Native 下单，返回二维码内容 code_url */
export async function createWechatNativeOrder(input: {
  orderId: string;
  amountFen: number;
  description: string;
  notifyUrl: string;
}): Promise<string> {
  const config = getWechatPayConfig();
  if (!config) throw new WechatPayError('微信支付尚未配置', 'GATEWAY_NOT_CONFIGURED');

  const data = await wechatRequest<{ code_url?: string }>(
    'POST',
    '/v3/pay/transactions/native',
    {
      appid: config.appId,
      mchid: config.mchId,
      description: input.description,
      out_trade_no: input.orderId,
      notify_url: input.notifyUrl,
      amount: { total: input.amountFen, currency: 'CNY' },
    },
  );

  if (!data.code_url) throw new WechatPayError('微信支付未返回二维码链接');
  return data.code_url;
}

/** H5 下单，返回可在手机浏览器打开的支付地址 */
export async function createWechatH5Order(input: {
  orderId: string;
  amountFen: number;
  description: string;
  notifyUrl: string;
  payerIp: string;
}): Promise<string> {
  const config = getWechatPayConfig();
  if (!config) throw new WechatPayError('微信支付尚未配置', 'GATEWAY_NOT_CONFIGURED');

  const data = await wechatRequest<{ h5_url?: string }>(
    'POST',
    '/v3/pay/transactions/h5',
    {
      appid: config.appId,
      mchid: config.mchId,
      description: input.description,
      out_trade_no: input.orderId,
      notify_url: input.notifyUrl,
      amount: { total: input.amountFen, currency: 'CNY' },
      scene_info: {
        payer_client_ip: input.payerIp,
        h5_info: { type: 'Wap' },
      },
    },
  );

  if (!data.h5_url) throw new WechatPayError('微信支付未返回 H5 支付地址');
  return data.h5_url;
}

/** JSAPI 下单，返回 WeixinJSBridge 拉起收银台所需的签名参数 */
export async function createWechatJsapiOrder(input: {
  orderId: string;
  amountFen: number;
  description: string;
  notifyUrl: string;
  openid: string;
}): Promise<WechatJsapiPaymentParams> {
  const config = getWechatPayConfig();
  if (!config) throw new WechatPayError('微信支付尚未配置', 'GATEWAY_NOT_CONFIGURED');

  const data = await wechatRequest<{ prepay_id?: string }>(
    'POST',
    '/v3/pay/transactions/jsapi',
    {
      appid: config.appId,
      mchid: config.mchId,
      description: input.description,
      out_trade_no: input.orderId,
      notify_url: input.notifyUrl,
      amount: { total: input.amountFen, currency: 'CNY' },
      payer: { openid: input.openid },
    },
  );

  if (!data.prepay_id) throw new WechatPayError('微信支付未返回预支付会话');

  // 参与签名的字段顺序固定为 appId、timeStamp、nonceStr、package
  const timeStamp = Math.floor(Date.now() / 1000).toString();
  const nonceStr = randomBytes(16).toString('hex');
  const packageValue = `prepay_id=${data.prepay_id}`;
  const paySign = signMessage(
    config.privateKey,
    `${config.appId}\n${timeStamp}\n${nonceStr}\n${packageValue}\n`,
  );

  return {
    appId: config.appId,
    timeStamp,
    nonceStr,
    package: packageValue,
    signType: 'RSA',
    paySign,
  };
}

const TRADE_STATE_MAP: Record<string, DonationStatus> = {
  SUCCESS: 'paid',
  REFUND: 'paid',
  CLOSED: 'closed',
  REVOKED: 'closed',
  PAYERROR: 'closed',
};

export async function queryWechatOrder(
  orderId: string,
): Promise<{ status: DonationStatus; transactionId?: string }> {
  const config = getWechatPayConfig();
  if (!config) throw new WechatPayError('微信支付尚未配置', 'GATEWAY_NOT_CONFIGURED');

  const urlPath = `/v3/pay/transactions/out-trade-no/${encodeURIComponent(orderId)}?mchid=${encodeURIComponent(config.mchId)}`;
  const data = await wechatRequest<{ trade_state?: string; transaction_id?: string }>(
    'GET',
    urlPath,
  );

  return {
    status: TRADE_STATE_MAP[data.trade_state ?? ''] ?? 'pending',
    transactionId: data.transaction_id,
  };
}

export interface WechatNotifyEvent {
  outTradeNo: string;
  transactionId?: string;
  tradeState: string;
  amountTotal?: number;
}

/** 验签并解密回调，返回订单事件 */
export function parseWechatNotify(headers: Headers, rawBody: string): WechatNotifyEvent {
  const config = getWechatPayConfig();
  if (!config) throw new WechatNotifyError('微信支付尚未配置', 401);

  const signatureHeaders = {
    timestamp: headers.get('wechatpay-timestamp') ?? '',
    nonce: headers.get('wechatpay-nonce') ?? '',
    signature: headers.get('wechatpay-signature') ?? '',
    serial: headers.get('wechatpay-serial') ?? '',
  };

  if (signatureHeaders.serial !== config.publicKeyId) {
    throw new WechatNotifyError('回调公钥 ID 不匹配', 401);
  }

  try {
    verifyNotifySignature({ publicKey: config.publicKey, headers: signatureHeaders, body: rawBody });
  } catch (error) {
    throw new WechatNotifyError(error instanceof Error ? error.message : '回调签名验证失败', 401);
  }

  let resource: WechatNotifyResource | undefined;
  try {
    resource = (JSON.parse(rawBody) as { resource?: WechatNotifyResource }).resource;
  } catch {
    throw new WechatNotifyError('回调请求体不是合法 JSON', 500);
  }
  if (!resource) throw new WechatNotifyError('回调缺少 resource 字段', 500);

  let decrypted: {
    out_trade_no?: string;
    transaction_id?: string;
    trade_state?: string;
    amount?: { total?: number };
  };
  try {
    decrypted = decryptNotifyResource(config.apiV3Key, resource) as typeof decrypted;
  } catch (error) {
    throw new WechatNotifyError(error instanceof Error ? error.message : '回调解密失败', 500);
  }

  if (!decrypted.out_trade_no) throw new WechatNotifyError('回调缺少订单号', 500);

  return {
    outTradeNo: decrypted.out_trade_no,
    transactionId: decrypted.transaction_id,
    tradeState: decrypted.trade_state ?? '',
    amountTotal: decrypted.amount?.total,
  };
}
