export type DonateChannel = 'alipay' | 'wechat' | 'paypal';

export type DonateChannelConfig = Record<DonateChannel, boolean>;

export interface DonateConfig {
  channels: DonateChannelConfig;
  /** 微信内置浏览器是否可直接走 JSAPI 支付 */
  wechatJsapi: boolean;
  /** PayPal 渠道客户端 ID（公开值，前端加载 PayPal SDK 用）；未配置时为 null */
  paypalClientId: string | null;
}

export type DonationMode = 'native' | 'jsapi';

export interface CreateDonationRequest {
  channel: DonateChannel;
  /**
   * 金额：支付宝/微信单位为元（整数），PayPal 单位为 PAYPAL_CURRENCY（最多 2 位小数）。
   * 范围由 src/config/site 的 DONATION_* 与 PAYPAL_* 档位决定
   */
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
  /** PayPal 订单 ID，存在时前端用 PayPal Buttons 拉起收银台 */
  paypalOrderId?: string;
  /** 无状态查单令牌，前端轮询与回跳确认时回传 */
  statusToken: string;
}

export type DonationStatus = 'pending' | 'paid' | 'refunded' | 'closed';

export interface DonationStatusResponse {
  orderId: string;
  channel: DonateChannel;
  /** 金额：人民币渠道单位为元，PayPal 单位为其币种 */
  amount: number;
  status: DonationStatus;
}

/** PayPal capture 确认结果 */
export interface PaypalCaptureResponse {
  orderId: string;
  status: 'paid' | 'failed';
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
