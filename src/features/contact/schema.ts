import { z } from 'zod';

export const contactSchema = z.object({
  name: z.string().trim().min(1, '请填写姓名').max(50, '姓名过长'),
  email: z
    .string()
    .trim()
    .min(1, '请填写邮箱')
    .max(255, '邮箱过长')
    .email('请输入正确的邮箱地址'),
  content: z.string().trim().min(1, '请填写内容').max(2000, '内容过长'),
  // 蜜罐：真实访客不会填写，仅用于拦截机器人
  website: z.string().trim().max(0, '检测到异常提交'),
});

export type ContactInput = z.infer<typeof contactSchema>;
