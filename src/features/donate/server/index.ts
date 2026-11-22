import { randomBytes } from 'node:crypto';

import type {
  CreateDonationRequest,
  CreateDonationResponse,
  DonateChannel,
  DonateChannelConfig,
  DonationStatusResponse,
} from '../types';
import { claimPaid, getOrder, saveOrder, type StoredDonationOrder } from './orders';
import {
  createWechatJsapiOrder,
  createWechatNativeOrder,
  queryWechatOrder,
  WechatPayError,
} from './wechat';

export type DonationErrorCode =
  | 'GATEWAY_NOT_CONFIGURED'
  | 'GATEWAY_NOT_IMPLEMENTED'
  | 'GATEWAY_FAILED'
  | 'INVALID_ORDER'
  | 'WECHAT_OAUTH_REQUIRED';

export class DonationGatewayError extends Error {
  constructor(
    public readonly code: DonationErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'DonationGatewayError';
  }
}

/**
 * 各渠道启用所需的「占位」环境变量。
 * 微信支付已具备完整下单/回调逻辑；支付宝与 Apple Pay 待接入。
 */
const REQUIRED_ENV: Record<DonateChannel, string[]> = {
  alipay: ['ALIPAY_APP_ID', 'ALIPAY_PRIVATE_KEY', 'ALIPAY_PUBLIC_KEY'],
  wechat: [
    'WECHAT_MCH_ID',
    'WECHAT_APP_ID',
    'WECHAT_API_V3_KEY',
    'WECHAT_CERT_SERIAL_NO',
    'WECHAT_PRIVATE_KEY',
    'WECHAT_PUBLIC_KEY_ID',
    'WECHAT_PUBLIC_KEY',
  ],
  applepay: ['APPLE_PAY_MERCHANT_ID', 'APPLE_PAY_MERCHANT_VALIDATION_URL'],
};

export const isDonateChannelConfigured = (channel: DonateChannel): boolean =>
  REQUIRED_ENV[channel].every((key) => Boolean(process.env[key]));

export const getDonateChannelConfig = (): DonateChannelConfig => ({
  alipay: isDonateChannelConfigured('alipay'),
  wechat: isDonateChannelConfigured('wechat'),
  applepay: isDonateChannelConfigured('applepay'),
});

/** 微信内置浏览器走 JSAPI 还需要公众号 AppSecret */
export const isWechatJsapiConfigured = (): boolean =>
  isDonateChannelConfigured('wechat') && Boolean(process.env.WECHAT_APP_SECRET?.trim());

/** 微信支付要求 out_trade_no 为 6–32 位字母、数字或 _-|* */
function createOrderId(): string {
  return `D${Date.now().toString(36).toUpperCase()}${randomBytes(6).toString('hex').toUpperCase()}`;
}

export interface CreateDonationOptions {
  /** 回调地址，由调用方根据请求来源拼出 */
  notifyUrl: string;
  /** 微信内支付需要的 openid，由授权 Cookie 解析而来 */
  openid?: string;
}

export async function createDonation(
  input: CreateDonationRequest,
  options: CreateDonationOptions,
): Promise<CreateDonationResponse> {
  if (!isDonateChannelConfigured(input.channel)) {
    throw new DonationGatewayError('GATEWAY_NOT_CONFIGURED', '该支付渠道尚未配置');
  }

  if (input.channel !== 'wechat') {
    throw new DonationGatewayError(
      'GATEWAY_NOT_IMPLEMENTED',
      '该支付渠道的下单逻辑尚未接入',
    );
  }

  if (input.mode === 'jsapi') {
    if (!isWechatJsapiConfigured()) {
      throw new DonationGatewayError('GATEWAY_NOT_CONFIGURED', '微信内支付尚未配置');
    }
    if (!options.openid) {
      throw new DonationGatewayError('WECHAT_OAUTH_REQUIRED', '请先完成微信授权');
    }
  }

  const order: StoredDonationOrder = {
    orderId: createOrderId(),
    channel: 'wechat',
    amount: input.amount,
    // 金额以「分」提交给支付渠道，服务端按传入的整数元换算
    amountFen: input.amount * 100,
    status: 'pending',
    createdAt: Date.now(),
  };

  try {
    // 先落订单，确保回调到达时能查到金额与渠道
    await saveOrder(order);

    if (input.mode === 'jsapi') {
      const payment = await createWechatJsapiOrder({
        orderId: order.orderId,
        amountFen: order.amountFen,
        description: '打赏支持',
        notifyUrl: options.notifyUrl,
        openid: options.openid as string,
      });
      return { orderId: order.orderId, channel: 'wechat', payment };
    }

    const codeUrl = await createWechatNativeOrder({
      orderId: order.orderId,
      amountFen: order.amountFen,
      description: '打赏支持',
      notifyUrl: options.notifyUrl,
    });

    return { orderId: order.orderId, channel: 'wechat', codeUrl };
  } catch (error) {
    console.error('[donate] 微信下单失败', error);
    if (error instanceof WechatPayError) {
      throw new DonationGatewayError('GATEWAY_FAILED', '下单失败，请稍后重试');
    }
    throw error;
  }
}

export async function queryDonation(orderId: string): Promise<DonationStatusResponse> {
  const order = await getOrder(orderId);
  if (!order) throw new DonationGatewayError('INVALID_ORDER', '订单不存在');

  if (order.status !== 'pending') return { orderId: order.orderId, status: order.status };

  if (order.channel !== 'wechat') {
    throw new DonationGatewayError('GATEWAY_NOT_IMPLEMENTED', '该支付渠道的查单逻辑尚未接入');
  }

  let remote: Awaited<ReturnType<typeof queryWechatOrder>>;
  try {
    remote = await queryWechatOrder(order.orderId);
  } catch (error) {
    console.error('[donate] 微信查单失败', error);
    throw new DonationGatewayError('GATEWAY_FAILED', '查询订单失败，请稍后重试');
  }

  if (remote.status === 'paid') {
    // 回调与轮询可能同时到达，claimPaid 保证只写入一次
    if (await claimPaid(order.orderId)) {
      await saveOrder({
        ...order,
        status: 'paid',
        paidAt: Date.now(),
        transactionId: remote.transactionId,
      });
    }
  } else if (remote.status === 'closed') {
    await saveOrder({ ...order, status: 'closed' });
  }

  return { orderId: order.orderId, status: remote.status };
}
