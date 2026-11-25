import { postWebhook } from './deliver';
import type { NotificationEvent } from './providers';

export { toBotSafeText } from './providers';
export { isWebhookConfigured } from './deliver';
export type { NotificationEvent };

export interface NotifyOutcome {
  /** Webhook 投递失败原因；undefined 表示成功 */
  webhookError?: string;
}

/**
 * 向站长投递一条通知：Webhook 为主通道。
 *
 * 只负责传输与错误收集，不决定业务后果——留言提交要把 Webhook 失败上抛成 502，
 * 而支付回调里任何通知失败都只能记日志（不能让微信以为投递失败而无限重试）。
 */
export async function notifyOwner(notice: {
  event: NotificationEvent;
}): Promise<NotifyOutcome> {
  const webhookError = await postWebhook(notice.event).then(
    () => undefined,
    (error: unknown): string => (error instanceof Error ? error.message : String(error)),
  );

  return { webhookError };
}
