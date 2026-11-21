import React, { useState } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { CircleAlert, CircleCheck, CircleX, Loader2, Send } from 'lucide-react';
import { useForm } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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

import { sendMail, SendMailError } from './send-mail';
import { sendMailSchema, type SendMailInput } from '../schema';
import { cn } from '@/lib/utils';
import { trackEvent, captureException } from '@/utils/umami';

interface IEmailDialogProps {
  href: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const EmailDialog: React.FC<IEmailDialogProps> = ({ href, open, onOpenChange }) => {
  const [submitState, setSubmitState] = useState<
    'idle' | 'success' | 'partial' | 'error'
  >('idle');
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const recipient = href.replace(/^mailto:/, '');
  const isSubmitted =
    submitState === 'success' || submitState === 'partial';

  const form = useForm<SendMailInput>({
    resolver: zodResolver(sendMailSchema),
    defaultValues: { email: '', content: '', website: '' },
  });

  const onSubmit = async (data: SendMailInput) => {
    try {
      const result = await sendMail(data);
      setSubmitState(result.confirmationSent ? 'success' : 'partial');
      trackEvent('contact-submit', { status: result.confirmationSent ? 'success' : 'partial' });
      setFeedbackMessage(
        result.confirmationSent
          ? `留言已发送至 ${recipient}，确认邮件也已发送。再次点击按钮可清空表单。`
          : `站长已收到留言，但确认邮件未能送达 ${data.email}。请检查邮箱地址或垃圾邮件文件夹；留言已成功提交，无需重复发送。点击“完成”清空表单。`,
      );
    } catch (error) {
      const message = error instanceof SendMailError ? error.message : undefined;
      captureException(error, { feature: 'contact-form' });
      setSubmitState('error');
      trackEvent('contact-submit', { status: 'error' });
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
    onOpenChange(nextOpen);
  };

  const resetAfterResult = () => {
    if (isSubmitted) form.reset();
    setSubmitState('idle');
    setFeedbackMessage('');
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        overlayClassName="bg-[#07090c]/65 backdrop-blur-md"
        className="email-dialog-content rounded-2xl border-white/10 bg-[#14171c]/92 p-0 text-white shadow-[0_30px_80px_-24px_rgba(0,0,0,0.85)] backdrop-blur-xl"
      >
        <div className="h-px w-full shrink-0 bg-gradient-to-r from-transparent via-[#0295e5]/50 to-transparent" />
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
                        autoComplete="email"
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
                        autoComplete="off"
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
                  onClick={() => onOpenChange(false)}
                >
                  取消
                </Button>
                <Button
                  type={isSubmitted ? 'button' : 'submit'}
                  onClick={isSubmitted ? resetAfterResult : undefined}
                  disabled={form.formState.isSubmitting}
                  className={cn(
                    'text-white shadow-[0_8px_24px_-8px_rgba(2_149_229_0.5)]',
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
