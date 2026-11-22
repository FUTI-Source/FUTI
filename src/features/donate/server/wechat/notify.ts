import { claimPaid, getOrder, saveOrder } from '../orders';
import { parseWechatNotify, WechatNotifyError } from './index';

/**
 * 处理微信支付回调：验签 → 解密 → 校验金额 → 幂等更新订单。
 * 订单不存在时直接确认（避免微信对历史订单无限重试）。
 */
export async function handleWechatNotify(headers: Headers, rawBody: string): Promise<void> {
  const event = parseWechatNotify(headers, rawBody);
  const order = await getOrder(event.outTradeNo);

  if (!order) {
    console.warn('[donate] 微信回调对应的订单不存在', event.outTradeNo);
    return;
  }

  if (event.tradeState !== 'SUCCESS') return;

  if (event.amountTotal !== order.amountFen) {
    throw new WechatNotifyError('回调金额与订单金额不一致', 500);
  }

  if (order.status === 'paid') return;
  if (!(await claimPaid(order.orderId))) return;

  await saveOrder({
    ...order,
    status: 'paid',
    paidAt: Date.now(),
    transactionId: event.transactionId,
  });
}
