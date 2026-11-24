import { createDedupe } from '@/lib/dedupe';
import { logger } from '@/lib/logger';
import { isWebhookConfigured, notifyOwner } from '@/lib/notify';
import { SITE_NAME, SITE_URL } from '@/lib/site';

import type { DonateChannel } from '../types';

export const DONATE_CHANNEL_LABEL: Record<DonateChannel, string> = {
  alipay: '支付宝',
  wechat: '微信支付',
};

export interface DonationNoticeInput {
  channel: DonateChannel;
  /** 金额，单位为元；缺失时省略金额行 */
  amountYuan?: string;
  orderId: string;
}

/**
 * 微信 / 支付宝回调失败后会按退避策略重试数小时，前端查单也可能同时确认成功，
 * 同一笔订单因此会命中多次通知。窗口取一天，覆盖网关全部重试档位。
 */
const notifiedDonations = createDedupe({ windowMs: 24 * 60 * 60_000, max: 5000 });

/**
 * 打赏成功通知。
 *
 * 与留言不同，这里绝不向调用方抛错：支付回调一旦收到异常就会判定投递失败并无限重试，
 * 而钱已经到账，通知只是锦上添花——失败只留日志。
 */
export async function notifyDonationSuccess(input: DonationNoticeInput): Promise<void> {
  const channelLabel = DONATE_CHANNEL_LABEL[input.channel];

  if (!notifiedDonations.markOnce(`${input.channel}:${input.orderId}`)) {
    logger.info('[donate] 重复通知已跳过', { orderId: input.orderId, channel: input.channel });
    return;
  }

  const { webhookError, barkError } = await notifyOwner({
    event: {
      type: 'donation',
      title: '收到一笔新打赏',
      site: { name: SITE_NAME, url: SITE_URL },
      channel: channelLabel,
      amount: input.amountYuan,
      orderId: input.orderId,
      timestamp: new Date().toISOString(),
    },
    bark: {
      title: '收到一笔打赏',
      subtitle: channelLabel,
      body: [
        input.amountYuan ? `金额：¥${input.amountYuan}` : null,
        `订单：${input.orderId}`,
      ]
        .filter((line): line is string => line !== null)
        .join('\n'),
      group: '打赏收入',
      level: 'timeSensitive',
    },
  });

  if (barkError) logger.warn('[donate] Bark 推送失败', barkError);

  if (webhookError) {
    if (isWebhookConfigured()) logger.warn('[donate] Webhook 通知失败', webhookError);
    else logger.warn('[donate] 未配置通知 Webhook，跳过 Webhook 通知');
  }
}
