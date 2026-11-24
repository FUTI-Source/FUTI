export type DonateChannel = 'alipay' | 'wechat';

export type DonateChannelConfig = Record<DonateChannel, boolean>;

export interface DonateConfig {
  channels: DonateChannelConfig;
  /** 微信内置浏览器是否可直接走 JSAPI 支付 */
  wechatJsapi: boolean;
}

export type DonationMode = 'native' | 'jsapi';

export interface CreateDonationRequest {
  channel: DonateChannel;
  /** 金额，单位为元，范围由 site.ts 的 DONATION_MIN_AMOUNT / DONATION_MAX_AMOUNT 决定 */
  amount: number;
  /** 仅微信支付有效：微信内用 jsapi，其他环境用 native 扫码 */
  mode?: DonationMode;
}

/** 微信 JSAPI 拉起支付收银台所需的参数（WeixinJSBridge） */
export interface WechatJsapiPaymentParams {
  appId: string;
  timeStamp: string;
  nonceStr: string;
  package: string;
  signType: 'RSA';
  paySign: string;
}

export interface CreateDonationResponse {
  orderId: string;
  channel: DonateChannel;
  /** 扫码支付链接，前端据此渲染二维码；跳转式渠道可为空 */
  codeUrl?: string;
  /** 跳转式支付地址（支付宝手机网站支付等） */
  redirectUrl?: string;
  /** 微信 JSAPI 支付参数，存在时前端直接拉起微信收银台 */
  payment?: WechatJsapiPaymentParams;
  /** 无状态查单令牌，前端轮询与回跳确认时回传 */
  statusToken: string;
}

export type DonationStatus = 'pending' | 'paid' | 'refunded' | 'closed';

export interface DonationStatusResponse {
  orderId: string;
  channel: DonateChannel;
  /** 金额，单位为元 */
  amount: number;
  status: DonationStatus;
}

/** 跳转式支付回到站点时携带的结果 */
export interface DonateResult {
  status: 'success' | 'cancel';
  /** 无状态查单令牌，由回跳地址携带 */
  token?: string;
}

export interface DonateErrorBody {
  error: {
    code: string;
    message: string;
  };
}
