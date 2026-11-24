import type { DonationStatus } from '../types';

/**
 * 微信 / 支付宝回调里的 trade_state 与站点统一状态的映射。
 *
 * 微信与支付宝的原始状态命名不同但语义可合并：
 * - 微信的 REFUND / 支付宝的 TRADE_REFUNDED 都指向「已退款」
 * - 微信的 CLOSED / 支付宝的 TRADE_CLOSED 都指向「已关闭」
 * - 微信的 REVOKED / PAYERROR 与支付宝的 TRADE_CLOSED 都归到「已关闭」
 *
 * 未命中的状态一律视为「待支付」，避免把未知状态误判为已支付。
 */
export const TRADE_STATE_MAP: Record<string, DonationStatus> = {
  // 微信
  SUCCESS: 'paid',
  REFUND: 'refunded',
  CLOSED: 'closed',
  REVOKED: 'closed',
  PAYERROR: 'closed',
  // 支付宝
  TRADE_SUCCESS: 'paid',
  TRADE_FINISHED: 'paid',
  TRADE_REFUNDED: 'refunded',
  TRADE_CLOSED: 'closed',
  WAIT_BUYER_PAY: 'pending',
};

export function normalizeTradeState(raw: string | undefined): DonationStatus {
  return TRADE_STATE_MAP[raw ?? ''] ?? 'pending';
}
