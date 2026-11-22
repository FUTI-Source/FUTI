import { claimPaid, getOrder, saveOrder } from '../orders';

import { AlipayNotifyError, parseAlipayNotify } from '.';

/** 处理支付宝异步通知：验签、核对金额、幂等落库 */
export async function handleAlipayNotify(params: Record<string, string>): Promise<void> {
  const notify = parseAlipayNotify(params);

  if (notify.tradeStatus !== 'TRADE_SUCCESS' && notify.tradeStatus !== 'TRADE_FINISHED') {
    return;
  }

  const order = await getOrder(notify.outTradeNo);
  if (!order) {
    console.warn('[donate] 支付宝回调订单不存在', notify.outTradeNo);
    return;
  }
  if (order.channel !== 'alipay') {
    throw new AlipayNotifyError('订单渠道不匹配', 500);
  }

  const amountFen = Math.round(Number(notify.totalAmount) * 100);
  if (!Number.isFinite(amountFen) || amountFen !== order.amountFen) {
    throw new AlipayNotifyError('订单金额不一致', 500);
  }

  if (order.status === 'paid') return;

  if (await claimPaid(order.orderId)) {
    await saveOrder({
      ...order,
      status: 'paid',
      paidAt: Date.now(),
      transactionId: notify.tradeNo,
    });
  }
}
