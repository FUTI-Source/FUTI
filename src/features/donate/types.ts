export type DonateChannel = 'applepay' | 'googlepay';

export type DonateChannelConfig = Record<DonateChannel, boolean>;

export interface CreateDonationRequest {
  channel: DonateChannel;
  /** 金额，单位为元，1–10000 的整数 */
  amount: number;
}

export interface CreateDonationResponse {
  channel: DonateChannel;
  /** Stripe 收银台地址，前端直接跳转，Apple Pay / Google Pay 在其中完成 */
  redirectUrl: string;
}

export interface DonateErrorBody {
  error: {
    code: string;
    message: string;
  };
}
