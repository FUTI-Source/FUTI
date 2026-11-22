import type {
  CreateDonationRequest,
  CreateDonationResponse,
  DonateChannel,
  DonateChannelConfig,
  DonationStatusResponse,
} from '../types';
import { createMockOrder, getMockOrder, isMockEnabled } from './mock';

export type DonationErrorCode =
  | 'GATEWAY_NOT_CONFIGURED'
  | 'GATEWAY_NOT_IMPLEMENTED'
  | 'GATEWAY_FAILED'
  | 'INVALID_ORDER';

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
 * 微信、支付宝、云闪付共用同一个星驿付商户。
 * 终端号、网关地址与签名方式需按官方对接文档补充。
 */
const REQUIRED_ENV: Record<DonateChannel, string[]> = {
  wechat: ['XINGYIFU_MCH_ID', 'XINGYIFU_API_KEY'],
  alipay: ['XINGYIFU_MCH_ID', 'XINGYIFU_API_KEY'],
  unionpay: ['XINGYIFU_MCH_ID', 'XINGYIFU_API_KEY'],
};

export const isDonateChannelConfigured = (channel: DonateChannel): boolean =>
  isMockEnabled() ||
  REQUIRED_ENV[channel].every((key) => Boolean(process.env[key]));

export const getDonateChannelConfig = (): DonateChannelConfig => ({
  wechat: isDonateChannelConfigured('wechat'),
  alipay: isDonateChannelConfigured('alipay'),
  unionpay: isDonateChannelConfigured('unionpay'),
});

export interface CreateDonationOptions {
  /** 站点来源，用于拼接模拟收银台地址 */
  origin: string;
}

export async function createDonation(
  input: CreateDonationRequest,
  options: CreateDonationOptions,
): Promise<CreateDonationResponse> {
  if (isMockEnabled()) {
    const order = createMockOrder(input);
    return {
      channel: input.channel,
      redirectUrl: `${options.origin}/api/donate/mock/cashier?orderId=${encodeURIComponent(order.orderId)}`,
    };
  }

  if (!isDonateChannelConfigured(input.channel)) {
    throw new DonationGatewayError('GATEWAY_NOT_CONFIGURED', '该支付渠道尚未配置');
  }

  // 星驿付下单需要官方文档中的网关地址、签名规则与回调协议，
  // 资料齐全后在此实现统一下单并返回收银台地址。
  throw new DonationGatewayError(
    'GATEWAY_NOT_IMPLEMENTED',
    '星驿付接口尚未接入，请先提供对接文档',
  );
}

export function queryDonation(orderId: string): DonationStatusResponse {
  const order = getMockOrder(orderId);
  if (!order) throw new DonationGatewayError('INVALID_ORDER', '订单不存在');
  return { orderId: order.orderId, status: order.status };
}
