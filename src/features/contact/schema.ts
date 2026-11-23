import { z } from 'zod';

export const contactSchema = z
  .object({
    name: z.string().trim().min(1, '请输入姓名').max(50, '姓名过长'),
    email: z.string().min(1, '请输入邮箱地址').max(254).email('邮箱格式不正确'),
    phoneCountryCode: z
      .string()
      .trim()
      .regex(/^\+\d{1,4}$/, '区号格式不正确')
      .optional(),
    phone: z.string().trim().max(32, '电话号码过长').optional(),
    content: z.string().min(1, '请输入发送内容').max(5000),
    website: z.string().max(0, '请求无效').optional(),
  })
  .superRefine((value, ctx) => {
    const phone = value.phone?.trim();
    if (!phone) return;

    const digits = phone.replace(/\D/g, '');
    if (digits.length < 5 || digits.length > 15) {
      ctx.addIssue({
        code: 'custom',
        path: ['phone'],
        message: '请输入有效电话号码',
      });
    }
  });

export type ContactInput = z.infer<typeof contactSchema>;
