import { parseAlipayNotify } from '.';

/**
 * 无状态模式：回调只做验签，确认收到即可。
 * 支付结果由前端携带签名令牌向支付宝查单确认，无需落库。
 */
export async function handleAlipayNotify(params: Record<string, string>): Promise<void> {
  parseAlipayNotify(params);
}
