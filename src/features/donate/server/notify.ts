import { sendDonationWebhook } from '@/features/contact/server';

import { DONATE_CHANNEL_LABEL, pushDonationBark, type DonationBarkInput } from './bark';

/** 打赏成功后推送 Bark 与 Webhook；两者失败都只记录日志，不影响回调响应 */
export async function notifyDonationSuccess(input: DonationBarkInput): Promise<void> {
  await Promise.all([
    pushDonationBark(input),
    sendDonationWebhook({
      channelLabel: DONATE_CHANNEL_LABEL[input.channel],
      amountYuan: input.amountYuan,
      orderId: input.orderId,
    }),
  ]);
}
