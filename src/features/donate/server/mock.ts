import type { DonateChannel, DonationStatus } from '../types';

export interface MockOrder {
  orderId: string;
  channel: DonateChannel;
  /** 金额，单位为元 */
  amount: number;
  status: DonationStatus;
  createdAt: number;
}

const ORDER_TTL_MS = 30 * 60_000;

const globalState = globalThis as typeof globalThis & {
  __donationMockOrders?: Map<string, MockOrder>;
};

const orders = (globalState.__donationMockOrders ??= new Map<string, MockOrder>());

/** 仅当显式开启时启用，切勿在生产环境设置 */
export const isMockEnabled = (): boolean => process.env.XINGYIFU_MOCK === 'true';

export const DONATE_CHANNEL_LABELS: Record<DonateChannel, string> = {
  wechat: '微信支付',
  alipay: '支付宝',
  unionpay: '云闪付',
};

function pruneExpired() {
  const now = Date.now();
  for (const [orderId, order] of orders) {
    if (now - order.createdAt > ORDER_TTL_MS) orders.delete(orderId);
  }
}

export function createMockOrder(input: {
  channel: DonateChannel;
  amount: number;
}): MockOrder {
  pruneExpired();

  const order: MockOrder = {
    orderId: `MOCK${Date.now().toString(36).toUpperCase()}${Math.random()
      .toString(36)
      .slice(2, 10)
      .toUpperCase()}`,
    channel: input.channel,
    amount: input.amount,
    status: 'pending',
    createdAt: Date.now(),
  };

  orders.set(order.orderId, order);
  return order;
}

export function getMockOrder(orderId: string): MockOrder | undefined {
  pruneExpired();
  return orders.get(orderId);
}

export function setMockOrderStatus(
  orderId: string,
  status: DonationStatus,
): MockOrder | undefined {
  const order = getMockOrder(orderId);
  if (!order) return undefined;
  order.status = status;
  return order;
}
