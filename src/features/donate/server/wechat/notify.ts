import { parseWechatNotify, type WechatNotifyEvent } from './index';

/**
 * 无状态模式：回调只做验签与解密，确认收到即可。
 * 支付结果由前端携带签名令牌向微信查单确认，无需落库。
 */
export async function handleWechatNotify(
  headers: Headers,
  rawBody: string,
): Promise<WechatNotifyEvent> {
  return parseWechatNotify(headers, rawBody);
}
