import React, { useState } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { motion } from 'framer-motion';
import { Loader2, Send } from 'lucide-react';
import type { IconType } from '@icons-pack/react-simple-icons';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
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
}

export const EmailLink: React.FC<IEmailLinkProps> = ({ Icon, href, label }) => {
  const [open, setOpen] = useState(false);
  const recipient = href.replace(/^mailto:/, '');

  const form = useForm<EmailFormData>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: '', content: '' },
  });

  const onSubmit = async (data: EmailFormData) => {
    try {
      const result = await sendMail(data.email, data.content);
      if (result.confirmationSent) {
        toast.success('留言已发送，确认邮件已送达你的邮箱', {
          description: `内容已发送至 ${recipient}，并已向 ${data.email} 发出确认邮件`,
        });
      } else {
        toast.success('留言已发送', {
          description: `内容已发送至 ${recipient}，但确认邮件未能送达 ${data.email}`,
        });
      }
      setOpen(false);
      form.reset();
    } catch (error) {
      const message = (
        error as { response?: { data?: { error?: { message?: string } } } }
      ).response?.data?.error?.message;
      toast.error('发送失败', {
        description: message ?? '请稍后重试',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <motion.button
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
        </motion.button>
      </DialogTrigger>
      <DialogContent className="overflow-hidden border-[#0295e5]/40 bg-[#1b1e24]/95 p-0 text-white shadow-[0_0_36px_rgba(2_149_229_0.28)] backdrop-blur-md">
        <div className="h-1 w-full bg-gradient-to-r from-[#37eff9] via-[#0091e4] to-[#64c6f4]" />
        <div className="px-6 pt-5 pb-6">
          <DialogHeader>
            <DialogTitle className="font-geometos text-xl tracking-wide text-white/90">
              发送邮件
            </DialogTitle>
            <DialogDescription className="text-white/45">
              留下你的邮箱与内容，提交后将通过 139 邮箱发送给站长
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="mt-5 space-y-4">
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
                  type="submit"
                  disabled={form.formState.isSubmitting}
                  className="bg-[#0295e5] text-white shadow-[0_0_18px_rgba(2_149_229_0.45)] hover:bg-[#0295e5]/90"
                >
                  {form.formState.isSubmitting ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      发送中…
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
