import type {
  CreateDonationRequest,
  CreateDonationResponse,
  DonateChannel,
  DonateChannelConfig,
} from '../types';
import { createStripeCheckoutSession, getStripeConfig, StripeError } from './stripe';

export type DonationErrorCode = 'GATEWAY_NOT_CONFIGURED' | 'GATEWAY_FAILED';

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
 * Apple Pay 与 Google Pay 共用 Stripe 收款。
 * 密钥未配置时两个渠道都会显示为「未配置」。
 */
const REQUIRED_ENV: Record<DonateChannel, string[]> = {
  applepay: ['STRIPE_SECRET_KEY'],
  googlepay: ['STRIPE_SECRET_KEY'],
};

export const isDonateChannelConfigured = (channel: DonateChannel): boolean =>
  REQUIRED_ENV[channel].every((key) => Boolean(process.env[key]));

export const getDonateChannelConfig = (): DonateChannelConfig => ({
  applepay: isDonateChannelConfigured('applepay'),
  googlepay: isDonateChannelConfigured('googlepay'),
});

export interface CreateDonationOptions {
  /** 支付完成后的返回地址 */
  successUrl: string;
  /** 取消支付后的返回地址 */
  cancelUrl: string;
}

export async function createDonation(
  input: CreateDonationRequest,
  options: CreateDonationOptions,
): Promise<CreateDonationResponse> {
  if (!getStripeConfig() || !isDonateChannelConfigured(input.channel)) {
    throw new DonationGatewayError('GATEWAY_NOT_CONFIGURED', '该支付渠道尚未配置');
  }

  try {
    const redirectUrl = await createStripeCheckoutSession({
      amountFen: input.amount * 100,
      channel: input.channel,
      description: '打赏支持',
      successUrl: options.successUrl,
      cancelUrl: options.cancelUrl,
    });

    return { channel: input.channel, redirectUrl };
  } catch (error) {
    console.error('[donate] Stripe 下单失败', error);
    if (error instanceof StripeError) {
      throw new DonationGatewayError('GATEWAY_FAILED', '下单失败，请稍后重试');
    }
    throw error;
  }
}
