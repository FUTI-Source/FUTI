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
  /** 金额，单位为元，1–10000 的整数 */
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
}

export type DonationStatus = 'pending' | 'paid' | 'closed';

export interface DonationStatusResponse {
  orderId: string;
  status: DonationStatus;
}

/** 跳转式支付回到站点时携带的结果 */
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
