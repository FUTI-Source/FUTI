import { z } from 'zod';

export const sendMailSchema = z.object({
  email: z.string().min(1, '请输入邮箱地址').max(254).email('邮箱格式不正确'),
  content: z.string().min(1, '请输入发送内容').max(5000),
  website: z.string().max(0, '请求无效').optional(),
});

export type SendMailInput = z.infer<typeof sendMailSchema>;
