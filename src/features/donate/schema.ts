import { z } from 'zod';

import {
  DONATION_MAX_AMOUNT,
  DONATION_MIN_AMOUNT,
  PAYPAL_CURRENCY,
  PAYPAL_MAX_AMOUNT,
  PAYPAL_MIN_AMOUNT,
} from '@/config/site';

export const donateChannelSchema = z.enum(['alipay', 'wechat', 'paypal']);

export const createDonationSchema = z
  .object({
    channel: donateChannelSchema,
    amount: z.number().positive('金额必须大于 0'),
    mode: z.enum(['native', 'jsapi']).optional(),
  })
  .superRefine((value, ctx) => {
    const reject = (message: string) => {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['amount'], message });
    };

    if (value.channel === 'paypal') {
      // PayPal 允许 2 位小数；先排除浮点噪声，再校验档位
      const cents = Math.round(value.amount * 100);
      if (cents === 0 || Math.abs(value.amount * 100 - cents) > 1e-6) {
        reject('金额最多保留 2 位小数');
        return;
      }
      if (value.amount < PAYPAL_MIN_AMOUNT) {
        reject(`最低 ${PAYPAL_MIN_AMOUNT} ${PAYPAL_CURRENCY}`);
      }
      if (value.amount > PAYPAL_MAX_AMOUNT) {
        reject(`最高 ${PAYPAL_MAX_AMOUNT} ${PAYPAL_CURRENCY}`);
      }
      return;
    }

    // 支付宝 / 微信按人民币整数元校验
    if (!Number.isInteger(value.amount)) reject('金额必须为整数');
    if (value.amount < DONATION_MIN_AMOUNT) reject(`最低 ${DONATION_MIN_AMOUNT} 元`);
    if (value.amount > DONATION_MAX_AMOUNT) reject(`最高 ${DONATION_MAX_AMOUNT} 元`);
  });
