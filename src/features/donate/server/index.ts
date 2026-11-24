import { randomBytes } from 'node:crypto';

import {
  getAlipayEnv,
  getWechatOAuthEnv,
  getWechatPayEnv,
  isAlipayEnvSet,
  isWechatPayEnvSet,
} from '@/config/env';
import { logger } from '@/lib/logger';
import { DONATION_SUBJECT, SITE_URL } from '@/lib/site';
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
import { createOrderToken, isOrderTokenConfigured, verifyOrderToken } from './token';
import {
  createWechatH5Order,
  createWechatJsapiOrder,
  createWechatNativeOrder,
  queryWechatOrder,
  WechatPayError,
} from './wechat';

type DonationErrorCode =
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

const isDonateChannelConfigured = (channel: DonateChannel): boolean =>
  channel === 'alipay' ? isAlipayEnvSet() : isWechatPayEnvSet();

export const getDonateChannelConfig = (): DonateChannelConfig => ({
  alipay: isDonateChannelConfigured('alipay'),
  wechat: isDonateChannelConfigured('wechat'),
});

/** 微信内置浏览器走 JSAPI 还需要公众号 AppSecret */
export const isWechatJsapiConfigured = (): boolean =>
  isDonateChannelConfigured('wechat') && Boolean(getWechatOAuthEnv());

/** 微信支付要求 out_trade_no 为 6–32 位字母、数字或 _-|* */
function createOrderId(): string {
  return `D${Date.now().toString(36).toUpperCase()}${randomBytes(6).toString('hex').toUpperCase()}`;
}

const MOBILE_USER_AGENT = /Android|iPhone|iPad|iPod|Mobile|HarmonyOS/i;

interface CreateDonationOptions {
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
  if (!isOrderTokenConfigured()) {
    throw new DonationGatewayError('GATEWAY_NOT_CONFIGURED', '打赏服务尚未配置');
  }

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

  // 订单信息由签名令牌携带，不再落库
  const order = {
    orderId: createOrderId(),
    channel: input.channel,
    // 金额以「分」提交给微信，支付宝按元换算；Math.round 避免浮点误差（如 0.29 * 100 = 28.999…）
    amountFen: Math.round(input.amount * 100),
  };
  const statusToken = createOrderToken({
    orderId: order.orderId,
    channel: order.channel,
    amountFen: order.amountFen,
  });

  try {
    if (input.channel === 'alipay') {
      const alipayEnv = getAlipayEnv(`${SITE_URL}/api/donate/notify/alipay`);
      if (!alipayEnv) throw new DonationGatewayError('GATEWAY_NOT_CONFIGURED', '支付宝尚未配置');
      const notifyUrl = alipayEnv.notifyUrl;

      if (MOBILE_USER_AGENT.test(options.userAgent)) {
        const redirectUrl = createAlipayWapUrl({
          orderId: order.orderId,
          amountFen: order.amountFen,
          description: DONATION_SUBJECT,
          notifyUrl,
          returnUrl: `${SITE_URL}/?donate=success&token=${encodeURIComponent(statusToken)}`,
          quitUrl: `${SITE_URL}/`,
        });
        return { orderId: order.orderId, channel: 'alipay', redirectUrl, statusToken };
      }

      const codeUrl = await createAlipayPrecreateOrder({
        orderId: order.orderId,
        amountFen: order.amountFen,
        description: DONATION_SUBJECT,
        notifyUrl,
      });
      return { orderId: order.orderId, channel: 'alipay', codeUrl, statusToken };
    }

    const wechatEnv = getWechatPayEnv(`${SITE_URL}/api/donate/notify/wechat`);
    if (!wechatEnv) throw new DonationGatewayError('GATEWAY_NOT_CONFIGURED', '微信支付尚未配置');
    const notifyUrl = wechatEnv.notifyUrl;

    if (input.mode === 'jsapi') {
      const payment = await createWechatJsapiOrder({
        orderId: order.orderId,
        amountFen: order.amountFen,
        description: DONATION_SUBJECT,
        notifyUrl,
        openid: options.openid!, // 上方 L101 已校验非空
      });
      return { orderId: order.orderId, channel: 'wechat', payment, statusToken };
    }

    // 微信外手机浏览器用 H5，桌面端用扫码
    if (MOBILE_USER_AGENT.test(options.userAgent)) {
      const h5Url = await createWechatH5Order({
        orderId: order.orderId,
        amountFen: order.amountFen,
        description: DONATION_SUBJECT,
        notifyUrl,
        payerIp: options.payerIp || '127.0.0.1',
      });
      // 支付完成后跳回站点，由前端携带令牌查询订单
      const redirect = new URL(h5Url);
      redirect.searchParams.set(
        'redirect_url',
        `${SITE_URL}/?donate=success&token=${encodeURIComponent(statusToken)}`,
      );
      return {
        orderId: order.orderId,
        channel: 'wechat',
        redirectUrl: redirect.toString(),
        statusToken,
      };
    }

    const codeUrl = await createWechatNativeOrder({
      orderId: order.orderId,
      amountFen: order.amountFen,
      description: DONATION_SUBJECT,
      notifyUrl,
    });

    return { orderId: order.orderId, channel: 'wechat', codeUrl, statusToken };
  } catch (error) {
    logger.error('[donate] 下单失败', error);
    if (error instanceof WechatPayError || error instanceof AlipayError) {
      // 透传网关返回的具体原因（不含敏感信息），便于定位配置/权限问题
      throw new DonationGatewayError('GATEWAY_FAILED', error.message || '下单失败，请稍后重试');
    }
    throw error;
  }
}

export async function queryDonation(token: string): Promise<DonationStatusResponse> {
  const payload = verifyOrderToken(token);
  if (!payload) throw new DonationGatewayError('INVALID_ORDER', '订单不存在或已过期');

  let status: DonationStatusResponse['status'];
  let amountFen: number | undefined;

  try {
    if (payload.channel === 'alipay') {
      const result = await queryAlipayOrder(payload.orderId);
      status = result.status;
      amountFen = result.amountFen;
    } else {
      const result = await queryWechatOrder(payload.orderId);
      status = result.status;
      amountFen = result.amountFen;
    }
  } catch (error) {
    logger.error('[donate] 查单失败', error);
    throw new DonationGatewayError('GATEWAY_FAILED', '查询订单失败，请稍后重试');
  }

  // 金额交叉校验：网关返回的金额必须与令牌中记录的金额一致，防止篡改或重放
  if (amountFen !== undefined && amountFen !== payload.amountFen) {
    logger.error('[donate] 金额不匹配', {
      orderId: payload.orderId,
      expected: payload.amountFen,
      actual: amountFen,
    });
    throw new DonationGatewayError('INVALID_ORDER', '订单金额异常');
  }

  return {
    orderId: payload.orderId,
    channel: payload.channel,
    amount: payload.amountFen / 100,
    status,
  };
}
