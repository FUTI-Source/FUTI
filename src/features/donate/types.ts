export type DonateChannel = 'alipay' | 'wechat' | 'applepay';

export type DonateChannelConfig = Record<DonateChannel, boolean>;

export interface CreateDonationRequest {
  channel: DonateChannel;
  /** 金额，单位为元，1–500 的整数 */
  amount: number;
}

export interface CreateDonationResponse {
  orderId: string;
  channel: DonateChannel;
  /** 扫码支付链接，前端据此渲染二维码；跳转式渠道可为空 */
  codeUrl?: string;
  /** 跳转式支付地址（如 Apple Pay 会话或收银台） */
  redirectUrl?: string;
}

export type DonationStatus = 'pending' | 'paid' | 'closed';

export interface DonationStatusResponse {
  orderId: string;
  status: DonationStatus;
}

export interface DonateErrorBody {
  error: {
    code: string;
    message: string;
  };
}
