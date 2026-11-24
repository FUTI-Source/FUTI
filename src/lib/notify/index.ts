import { sendBark, type BarkMessage } from './bark';
import { postWebhook } from './deliver';
import type { NotificationEvent } from './providers';

export { truncateBarkBody } from './bark';
export { toBotSafeText } from './providers';
export { isWebhookConfigured } from './deliver';
export type { NotificationEvent, BarkMessage };

export interface NotifyOutcome {
  /** Webhook 投递失败原因；undefined 表示成功 */
  webhookError?: string;
  /** Bark 推送失败原因；undefined 表示成功或未配置 */
  barkError?: string;
}

/**
 * 向站长投递一条通知：Webhook 为主通道，Bark 为可选的 iPhone 推送。
 *
 * 只负责传输与错误收集，不决定业务后果——留言提交要把 Webhook 失败上抛成 502，
 * 而支付回调里任何通知失败都只能记日志（不能让微信以为投递失败而无限重试）。
 * 两条路径都基于同一个 outcome 做判断。
 */
export async function notifyOwner(notice: {
  event: NotificationEvent;
  bark?: BarkMessage;
}): Promise<NotifyOutcome> {
  const [webhookError, barkError] = await Promise.all([
    postWebhook(notice.event).then(
      () => undefined,
      (error: unknown): string => (error instanceof Error ? error.message : String(error)),
    ),
    notice.bark ? sendBark(notice.bark) : Promise.resolve(undefined),
  ]);

  return { webhookError, barkError };
}
