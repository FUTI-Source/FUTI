import { z } from 'zod';

import { DONATION_MAX_AMOUNT, DONATION_MIN_AMOUNT } from '~/site.config';

export const donateChannelSchema = z.enum(['alipay', 'wechat']);

export const createDonationSchema = z.object({
  channel: donateChannelSchema,
  amount: z
    .number()
    .int('金额必须为整数')
    .min(DONATION_MIN_AMOUNT, `最低 ${DONATION_MIN_AMOUNT} 元`)
    .max(DONATION_MAX_AMOUNT, `最高 ${DONATION_MAX_AMOUNT} 元`),
  mode: z.enum(['native', 'jsapi']).optional(),
});
