import { randomBytes } from 'node:crypto';

import { SITE_URL } from '../../../lib/site';
import type {
  CreateDonationRequest,
  CreateDonationResponse,
  DonateChannel,
  DonateChannelConfig,
  DonationStatusResponse,
} from '../types';
import {
  AlipayError,
  createAlipayPrecreateOrder,
  createAlipayWapUrl,
  queryAlipayOrder,
} from './alipay';
import { claimPaid, getOrder, saveOrder, type StoredDonationOrder } from './orders';
import {
  createWechatH5Order,
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

/** 各渠道启用所需的商户配置 */
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
};

export const isDonateChannelConfigured = (channel: DonateChannel): boolean =>
  REQUIRED_ENV[channel].every((key) => Boolean(process.env[key]));

export const getDonateChannelConfig = (): DonateChannelConfig => ({
  alipay: isDonateChannelConfigured('alipay'),
  wechat: isDonateChannelConfigured('wechat'),
});

/** 微信内置浏览器走 JSAPI 还需要公众号 AppSecret */
export const isWechatJsapiConfigured = (): boolean =>
  isDonateChannelConfigured('wechat') && Boolean(process.env.WECHAT_APP_SECRET?.trim());

/** 微信支付要求 out_trade_no 为 6–32 位字母、数字或 _-|* */
function createOrderId(): string {
  return `D${Date.now().toString(36).toUpperCase()}${randomBytes(6).toString('hex').toUpperCase()}`;
}

const MOBILE_USER_AGENT = /Android|iPhone|iPad|iPod|Mobile|HarmonyOS/i;

export interface CreateDonationOptions {
  /** 请求 UA，用于决定支付宝走扫码还是手机网站支付 */
  userAgent: string;
  /** 微信内支付需要的 openid，由授权 Cookie 解析而来 */
  openid?: string;
  /** 微信 H5 下单需要的客户端 IP */
  payerIp?: string;
}

export async function createDonation(
  input: CreateDonationRequest,
  options: CreateDonationOptions,
): Promise<CreateDonationResponse> {
  if (!isDonateChannelConfigured(input.channel)) {
    throw new DonationGatewayError('GATEWAY_NOT_CONFIGURED', '该支付渠道尚未配置');
  }

  if (input.channel === 'wechat' && input.mode === 'jsapi') {
    if (!isWechatJsapiConfigured()) {
      throw new DonationGatewayError('GATEWAY_NOT_CONFIGURED', '微信内支付尚未配置');
    }
    if (!options.openid) {
      throw new DonationGatewayError('WECHAT_OAUTH_REQUIRED', '请先完成微信授权');
    }
  }

  const order: StoredDonationOrder = {
    orderId: createOrderId(),
    channel: input.channel,
    amount: input.amount,
    // 金额以「分」提交给微信，支付宝按元换算
    amountFen: input.amount * 100,
    status: 'pending',
    createdAt: Date.now(),
  };

  try {
    // 先落订单，确保回调到达时能查到金额与渠道
    await saveOrder(order);

    if (input.channel === 'alipay') {
      const notifyUrl =
        process.env.ALIPAY_NOTIFY_URL?.trim() || `${SITE_URL}/api/donate/notify/alipay`;

      if (MOBILE_USER_AGENT.test(options.userAgent)) {
        const redirectUrl = createAlipayWapUrl({
          orderId: order.orderId,
          amountFen: order.amountFen,
          description: '打赏支持',
          notifyUrl,
          returnUrl: `${SITE_URL}/?donate=success&orderId=${order.orderId}`,
          quitUrl: `${SITE_URL}/`,
        });
        return { orderId: order.orderId, channel: 'alipay', redirectUrl };
      }

      const codeUrl = await createAlipayPrecreateOrder({
        orderId: order.orderId,
        amountFen: order.amountFen,
        description: '打赏支持',
        notifyUrl,
      });
      return { orderId: order.orderId, channel: 'alipay', codeUrl };
    }

    const notifyUrl =
      process.env.WECHAT_NOTIFY_URL?.trim() || `${SITE_URL}/api/donate/notify/wechat`;

    if (input.mode === 'jsapi') {
      const payment = await createWechatJsapiOrder({
        orderId: order.orderId,
        amountFen: order.amountFen,
        description: '打赏支持',
        notifyUrl,
        openid: options.openid as string,
      });
      return { orderId: order.orderId, channel: 'wechat', payment };
    }

    // 微信外手机浏览器用 H5，桌面端用扫码
    if (MOBILE_USER_AGENT.test(options.userAgent)) {
      const h5Url = await createWechatH5Order({
        orderId: order.orderId,
        amountFen: order.amountFen,
        description: '打赏支持',
        notifyUrl,
        payerIp: options.payerIp || '127.0.0.1',
      });
      // 支付完成后跳回站点，由前端查询订单并展示结果
      const redirect = new URL(h5Url);
      redirect.searchParams.set(
        'redirect_url',
        `${SITE_URL}/?donate=success&orderId=${order.orderId}`,
      );
      return { orderId: order.orderId, channel: 'wechat', redirectUrl: redirect.toString() };
    }

    const codeUrl = await createWechatNativeOrder({
      orderId: order.orderId,
      amountFen: order.amountFen,
      description: '打赏支持',
      notifyUrl,
    });

    return { orderId: order.orderId, channel: 'wechat', codeUrl };
  } catch (error) {
    console.error('[donate] 下单失败', error);
    if (error instanceof WechatPayError || error instanceof AlipayError) {
      throw new DonationGatewayError('GATEWAY_FAILED', '下单失败，请稍后重试');
    }
    throw error;
  }
}

export async function queryDonation(orderId: string): Promise<DonationStatusResponse> {
  const order = await getOrder(orderId);
  if (!order) throw new DonationGatewayError('INVALID_ORDER', '订单不存在');

  if (order.status !== 'pending') return { orderId: order.orderId, status: order.status };

  let status: 'pending' | 'paid' | 'closed';
  let transactionId: string | undefined;

  try {
    if (order.channel === 'alipay') {
      const remote = await queryAlipayOrder(order.orderId);
      status = remote.status;
      transactionId = remote.transactionId;
    } else {
      const remote = await queryWechatOrder(order.orderId);
      status = remote.status;
      transactionId = remote.transactionId;
    }
  } catch (error) {
    console.error('[donate] 查单失败', error);
    throw new DonationGatewayError('GATEWAY_FAILED', '查询订单失败，请稍后重试');
  }

  if (status === 'paid') {
    // 回调与轮询可能同时到达，claimPaid 保证只写入一次
    if (await claimPaid(order.orderId)) {
      await saveOrder({
        ...order,
        status: 'paid',
        paidAt: Date.now(),
        transactionId,
      });
    }
  } else if (status === 'closed') {
    await saveOrder({ ...order, status: 'closed' });
  }

  return { orderId: order.orderId, status };
}
