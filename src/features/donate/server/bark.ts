import { sendBark } from '@/lib/bark';

import type { DonateChannel } from '../types';

export const DONATE_CHANNEL_LABEL: Record<DonateChannel, string> = {
  alipay: '支付宝',
  wechat: '微信支付',
};

export interface DonationBarkInput {
  channel: DonateChannel;
  /** 金额，单位为元；缺失时省略金额行 */
  amountYuan?: string;
  orderId: string;
}

/** 回调确认支付成功后向站长 iPhone 推送打赏通知 */
export async function pushDonationBark(input: DonationBarkInput): Promise<void> {
  const lines = [
    input.amountYuan ? `金额：¥${input.amountYuan}` : null,
    `订单：${input.orderId}`,
  ].filter((line): line is string => line !== null);

  await sendBark({
    title: '收到一笔打赏',
    subtitle: DONATE_CHANNEL_LABEL[input.channel],
    body: lines.join('\n'),
    group: '打赏收入',
    level: 'timeSensitive',
  });
}
