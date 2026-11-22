export type DonateChannel = 'wechat' | 'alipay' | 'unionpay';

export type DonateChannelConfig = Record<DonateChannel, boolean>;

export interface CreateDonationRequest {
  channel: DonateChannel;
  /** 金额，单位为元，1–10000 的整数 */
  amount: number;
}

export interface CreateDonationResponse {
  channel: DonateChannel;
  /** 星驿付收银台地址，前端直接跳转 */
  redirectUrl: string;
}

export type DonationStatus = 'pending' | 'paid' | 'closed';

export interface DonationStatusResponse {
  orderId: string;
  status: DonationStatus;
}

/** 支付完成后返回站点时携带的结果 */
export interface DonateResult {
  status: 'success' | 'cancel';
  orderId?: string;
}

export interface DonateErrorBody {
  error: {
    code: string;
    message: string;
  };
}
