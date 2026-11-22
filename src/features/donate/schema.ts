import { z } from 'zod';

export const donateChannelSchema = z.enum(['alipay', 'wechat']);

export const createDonationSchema = z.object({
  channel: donateChannelSchema,
  amount: z
    .number()
    .int('金额必须为整数')
    .min(1, '最低 1 元')
    .max(10000, '最高 10000 元'),
  mode: z.enum(['native', 'jsapi']).optional(),
});

export type CreateDonationInput = z.infer<typeof createDonationSchema>;
