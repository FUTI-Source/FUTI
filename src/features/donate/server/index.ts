import type {
  CreateDonationRequest,
  CreateDonationResponse,
  DonateChannel,
  DonateChannelConfig,
} from '../types';

export type DonationErrorCode =
  | 'GATEWAY_NOT_CONFIGURED'
  | 'GATEWAY_NOT_IMPLEMENTED'
  | 'GATEWAY_FAILED';

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
  REQUIRED_ENV[channel].every((key) => Boolean(process.env[key]));

export const getDonateChannelConfig = (): DonateChannelConfig => ({
  wechat: isDonateChannelConfigured('wechat'),
  alipay: isDonateChannelConfigured('alipay'),
  unionpay: isDonateChannelConfigured('unionpay'),
});

export async function createDonation(
  input: CreateDonationRequest,
): Promise<CreateDonationResponse> {
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
