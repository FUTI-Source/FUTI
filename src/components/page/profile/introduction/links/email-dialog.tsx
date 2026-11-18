import React, { useState } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import * as m from 'motion/react-m';
import { CircleAlert, CircleCheck, CircleX, Loader2, Send } from 'lucide-react';
import type { IconType } from '@icons-pack/react-simple-icons';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Button, buttonVariants } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

import { sendMail } from '@/api';
import { cn } from '@/lib/utils';

const emailSchema = z.object({
  email: z.string().min(1, '请输入邮箱地址').email('邮箱格式不正确'),
  content: z.string().min(1, '请输入发送内容'),
  website: z.string(),
});

type EmailFormData = z.infer<typeof emailSchema>;

const itemVariants = {
  hidden: { opacity: 0, y: -10 },
  visible: { opacity: 1, y: 0 },
};

interface IEmailLinkProps {
  Icon: IconType;
  href: string;
  label: string;
  initialOpen?: boolean;
}

export const EmailLink: React.FC<IEmailLinkProps> = ({ Icon, href, label, initialOpen = false }) => {
  const [open, setOpen] = useState(initialOpen);
  const [submitState, setSubmitState] = useState<
    'idle' | 'success' | 'partial' | 'error'
  >('idle');
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const recipient = href.replace(/^mailto:/, '');
  const isSubmitted =
    submitState === 'success' || submitState === 'partial';

  const form = useForm<EmailFormData>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: '', content: '', website: '' },
  });

  const onSubmit = async (data: EmailFormData) => {
    try {
      const result = await sendMail(data.email, data.content, data.website);
      setSubmitState(result.confirmationSent ? 'success' : 'partial');
      setFeedbackMessage(
        result.confirmationSent
          ? `留言已发送至 ${recipient}，确认邮件也已发送。再次点击按钮可清空表单。`
          : `站长已收到留言，但确认邮件未能送达 ${data.email}。请检查邮箱地址或垃圾邮件文件夹；留言已成功提交，无需重复发送。点击“完成”清空表单。`,
      );
    } catch (error) {
      const message = (
        error as { response?: { data?: { error?: { message?: string } } } }
      ).response?.data?.error?.message;
      setSubmitState('error');
      setFeedbackMessage(
        `${message ?? '发送失败，请稍后重试'}；点击“重试提交”可保留内容再次发送。`,
      );
    }
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      if (isSubmitted) form.reset();
      setSubmitState('idle');
      setFeedbackMessage('');
    }
    setOpen(nextOpen);
  };

  const resetAfterResult = () => {
    if (isSubmitted) form.reset();
    setSubmitState('idle');
    setFeedbackMessage('');
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <m.button
          type="button"
          variants={itemVariants}
          aria-label={label}
          className={cn(
            buttonVariants({ variant: 'ghost' }),
            'group hover:!bg-accent/20 cursor-pointer text-base font-bold text-[#ecf6ff]/85 hover:text-white max-sm:px-2',
          )}
        >
          <Icon className="size-4 fill-[#ecf6ff] stroke-[#ecf6ff]/85" />
          {label}
        </m.button>
      </DialogTrigger>
      <DialogContent className="email-dialog-content overflow-y-auto rounded-2xl border-[#0295e5]/40 bg-[#1b1e24]/95 p-0 text-white shadow-[0_0_36px_rgba(2_149_229_0.28)] backdrop-blur-md">
        <div className="h-1 w-full rounded-t-2xl bg-gradient-to-r from-[#37eff9] via-[#0091e4] to-[#64c6f4]" />
        <div className="email-dialog-body">
          <DialogHeader>
            <DialogTitle className="font-geometos text-xl tracking-wide text-white/90">
              发送邮件
            </DialogTitle>
            <DialogDescription className="text-white/45">
              留下你的邮箱与内容，提交后将通过 139 邮箱发送给站长
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="email-dialog-form">
              <input
                {...form.register('website')}
                type="text"
                tabIndex={-1}
                autoComplete="off"
                aria-hidden="true"
                className="absolute -left-[10000px] size-px overflow-hidden"
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white/70">
                      邮箱地址 <span aria-hidden="true" className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        inputMode="email"
                        placeholder="you@example.com"
                        className="border-white/15 bg-white/5 text-white placeholder:text-white/35 focus-visible:border-[#0295e5] focus-visible:ring-[#0295e5]/20"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-[#ff8a8a]" />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="content"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white/70">
                      发送内容 <span aria-hidden="true" className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        rows={5}
                        placeholder="想对我说的话……"
                        className="resize-none border-white/15 bg-white/5 text-white placeholder:text-white/35 focus-visible:border-[#0295e5] focus-visible:ring-[#0295e5]/20"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-[#ff8a8a]" />
                  </FormItem>
                )}
              />
              {feedbackMessage && (
                <p
                  role={submitState === 'error' ? 'alert' : 'status'}
                  className={cn(
                    'text-sm',
                    submitState === 'error'
                      ? 'text-[#ff8a8a]'
                      : submitState === 'partial'
                        ? 'text-[#ffd166]'
                        : 'text-[#64c6f4]',
                  )}
                >
                  {feedbackMessage}
                </p>
              )}
              <DialogFooter className="mt-2">
                <Button
                  type="button"
                  variant="ghost"
                  className="text-white/60 hover:bg-white/10 hover:text-white"
                  onClick={() => setOpen(false)}
                >
                  取消
                </Button>
                <Button
                  type={isSubmitted ? 'button' : 'submit'}
                  onClick={isSubmitted ? resetAfterResult : undefined}
                  disabled={form.formState.isSubmitting}
                  className={cn(
                    'text-white shadow-[0_0_18px_rgba(2_149_229_0.45)]',
                    submitState === 'error'
                      ? 'bg-[#c94b55] hover:bg-[#c94b55]/90'
                      : submitState === 'partial'
                        ? 'bg-[#9b741e] hover:bg-[#9b741e]/90'
                        : 'bg-[#0295e5] hover:bg-[#0295e5]/90',
                  )}
                >
                  {form.formState.isSubmitting ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      发送中…
                    </>
                  ) : submitState === 'success' ? (
                    <>
                      <CircleCheck className="size-4" />
                      已发送
                    </>
                  ) : submitState === 'partial' ? (
                    <>
                      <CircleAlert className="size-4" />
                      完成
                    </>
                  ) : submitState === 'error' ? (
                    <>
                      <CircleX className="size-4" />
                      重试提交
                    </>
                  ) : (
                    <>
                      <Send className="size-4" />
                      提交
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
};
