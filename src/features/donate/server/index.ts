import type {
  CreateDonationRequest,
  CreateDonationResponse,
  DonateChannel,
  DonateChannelConfig,
  DonationStatusResponse,
} from '../types';

export type DonationErrorCode =
  | 'GATEWAY_NOT_CONFIGURED'
  | 'GATEWAY_NOT_IMPLEMENTED'
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
 * 各渠道启用所需的「占位」环境变量。
 * 真实接入时仍需补充各自的下单/验签逻辑，这里仅用于判断是否已配置。
 */
const REQUIRED_ENV: Record<DonateChannel, string[]> = {
  alipay: ['ALIPAY_APP_ID', 'ALIPAY_PRIVATE_KEY', 'ALIPAY_PUBLIC_KEY'],
  wechat: [
    'WECHAT_MCH_ID',
    'WECHAT_APP_ID',
    'WECHAT_API_V3_KEY',
    'WECHAT_CERT_SERIAL_NO',
    'WECHAT_PRIVATE_KEY',
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

export async function createDonation(
  input: CreateDonationRequest,
): Promise<CreateDonationResponse> {
  if (!isDonateChannelConfigured(input.channel)) {
    throw new DonationGatewayError('GATEWAY_NOT_CONFIGURED', '该支付渠道尚未配置');
  }

  // TODO 接入真实下单：
  // - 支付宝当面付：alipay.trade.precreate，返回 qr_code
  // - 微信支付 Native：POST /v3/pay/transactions/native，返回 code_url
  // - Apple Pay：创建支付会话，返回 redirectUrl（需完成域名校验）
  // 下单金额必须使用服务端的价格表校验，不能直接信任前端传入的数值。
  throw new DonationGatewayError(
    'GATEWAY_NOT_IMPLEMENTED',
    '支付渠道已配置，但下单逻辑尚未接入',
  );
}

export async function queryDonation(orderId: string): Promise<DonationStatusResponse> {
  // TODO 按渠道查询订单状态（支付宝 trade.query / 微信订单查询）
  void orderId;
  throw new DonationGatewayError(
    'GATEWAY_NOT_IMPLEMENTED',
    '订单查询逻辑尚未接入',
  );
}
