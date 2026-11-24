/**
 * 服务端环境变量统一读取入口。
 *
 * 所有值一律先 trim 再判空，避免出现「配置探测认为可用、实际读取认为缺失」
 * 这类不一致（旧代码用 Boolean(process.env[k]) 探测、用 .trim() 读取）。
 * 仅服务端引用；客户端可见配置在 src/lib/site.ts。
 */
import { createHmac } from 'node:crypto';

export const envStr = (name: string): string => process.env[name]?.trim() ?? '';

export const envSet = (name: string): boolean => envStr(name).length > 0;

/** 用途隔离的密钥派生：同一份源密钥在不同用途下派生出不同结果 */
export function deriveKey(source: string, info: string): string {
  return createHmac('sha256', source).update(info).digest('hex');
}

/* ---------------------------------- 通知 ---------------------------------- */

export interface NotifyEnv {
  webhookUrl: string;
  webhookSecret: string;
  fallbackUrl: string;
  fallbackSecret: string;
}

export function getNotifyEnv(): NotifyEnv {
  const webhookSecret = envStr('NOTIFY_WEBHOOK_SECRET');
  return {
    webhookUrl: envStr('NOTIFY_WEBHOOK_URL'),
    webhookSecret,
    fallbackUrl: envStr('NOTIFY_WEBHOOK_FALLBACK_URL'),
    fallbackSecret: envStr('NOTIFY_WEBHOOK_FALLBACK_SECRET') || webhookSecret,
  };
}

/* -------------------------------- 微信支付 -------------------------------- */

export interface WechatPayEnv {
  mchId: string;
  appId: string;
  apiV3Key: string;
  serialNo: string;
  privateKey: string;
  publicKeyId: string;
  publicKey: string;
  notifyUrl: string;
}

const WECHAT_PAY_KEYS = [
  'WECHAT_MCH_ID',
  'WECHAT_APP_ID',
  'WECHAT_API_V3_KEY',
  'WECHAT_CERT_SERIAL_NO',
  'WECHAT_PRIVATE_KEY',
  'WECHAT_PUBLIC_KEY_ID',
  'WECHAT_PUBLIC_KEY',
] as const;

export const isWechatPayEnvSet = (): boolean =>
  WECHAT_PAY_KEYS.every((key) => envSet(key));

export function getWechatPayEnv(defaultNotifyUrl: string): WechatPayEnv | null {
  if (!isWechatPayEnvSet()) return null;

  return {
    mchId: envStr('WECHAT_MCH_ID'),
    appId: envStr('WECHAT_APP_ID'),
    apiV3Key: envStr('WECHAT_API_V3_KEY'),
    serialNo: envStr('WECHAT_CERT_SERIAL_NO'),
    privateKey: envStr('WECHAT_PRIVATE_KEY'),
    publicKeyId: envStr('WECHAT_PUBLIC_KEY_ID'),
    publicKey: envStr('WECHAT_PUBLIC_KEY'),
    notifyUrl: envStr('WECHAT_NOTIFY_URL') || defaultNotifyUrl,
  };
}

/** 微信内 JSAPI 支付与网页授权额外需要公众号 AppSecret */
export interface WechatOAuthEnv {
  appId: string;
  appSecret: string;
}

export function getWechatOAuthEnv(): WechatOAuthEnv | null {
  const appId = envStr('WECHAT_APP_ID');
  const appSecret = envStr('WECHAT_APP_SECRET');
  if (!appId || !appSecret) return null;
  return { appId, appSecret };
}

/* -------------------------------- 支付宝 --------------------------------- */

export interface AlipayEnv {
  appId: string;
  privateKey: string;
  publicKey: string;
  gateway: string;
  notifyUrl: string;
  /** 可选：填写后回调会校验卖家账号，防止跨商户通知 */
  sellerId: string;
}

const ALIPAY_DEFAULT_GATEWAY = 'https://openapi.alipay.com/gateway.do';

export const isAlipayEnvSet = (): boolean =>
  envSet('ALIPAY_APP_ID') && envSet('ALIPAY_PRIVATE_KEY') && envSet('ALIPAY_PUBLIC_KEY');

export function getAlipayEnv(defaultNotifyUrl: string): AlipayEnv | null {
  if (!isAlipayEnvSet()) return null;

  return {
    appId: envStr('ALIPAY_APP_ID'),
    privateKey: envStr('ALIPAY_PRIVATE_KEY'),
    publicKey: envStr('ALIPAY_PUBLIC_KEY'),
    gateway: envStr('ALIPAY_GATEWAY') || ALIPAY_DEFAULT_GATEWAY,
    notifyUrl: envStr('ALIPAY_NOTIFY_URL') || defaultNotifyUrl,
    sellerId: envStr('ALIPAY_SELLER_ID'),
  };
}

/* ------------------------------ 订单签名密钥 ------------------------------ */

/** 派生信息串：未显式配置时据此从支付私钥派生，与私钥本身用途隔离 */
const ORDER_SECRET_DERIVE_INFO = 'futi/donation-order-secret/v1';

/**
 * 显式配置 DONATION_ORDER_SECRET 优先；否则从支付私钥派生。
 * 派生源固定优先级（不随订单渠道变化），保证下单签名与查单验签同一密钥。
 * 私钥轮换会使未支付订单的令牌失效，因此长期部署建议显式配置。
 */
export function getOrderTokenSecret(): string | null {
  const explicit = envStr('DONATION_ORDER_SECRET');
  if (explicit) return explicit;

  const source = envStr('WECHAT_PRIVATE_KEY') || envStr('ALIPAY_PRIVATE_KEY');
  if (!source) return null;

  return deriveKey(source, ORDER_SECRET_DERIVE_INFO);
}

/**
 * openid Cookie 的签名密钥。
 * 不直接用 WECHAT_APP_SECRET 做 HMAC 密钥，避免与授权接口共用同一份原始密钥；
 * 同样支持显式配置覆盖。
 */
export function getOpenidCookieKey(): string | null {
  const explicit = envStr('DONATION_ORDER_SECRET');
  const oauth = getWechatOAuthEnv();
  if (!oauth) return null;

  return deriveKey(explicit || oauth.appSecret, 'futi/wechat-openid-cookie/v1');
}
