'use client';

import React from 'react';

import { CircleAlert, ExternalLink, Heart } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

import { trackEvent } from '@/utils/umami';

/** 爱发电主页地址，未配置时弹窗展示提示 */
const DONATE_URL = process.env.NEXT_PUBLIC_DONATE_AFDIAN_URL?.trim() ?? '';

interface IDonateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const DonateDialog: React.FC<IDonateDialogProps> = ({ open, onOpenChange }) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        overlayClassName="bg-[#07090c]/65 backdrop-blur-md"
        className="site-dialog-content rounded-2xl border-white/10 bg-[#14171c]/92 p-0 text-white shadow-[0_30px_80px_-24px_rgba(0,0,0,0.85)] outline-none backdrop-blur-xl"
        tabIndex={-1}
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          const content = event.currentTarget as HTMLElement | null;
          content?.focus({ preventScroll: true });
        }}
      >
        <div className="h-px w-full shrink-0 bg-gradient-to-r from-transparent via-[#0295e5]/50 to-transparent" />
        <div className="site-dialog-body">
          <DialogHeader>
            <DialogTitle className="font-geometos text-xl tracking-wide text-white/90">
              打赏支持
            </DialogTitle>
            <DialogDescription className="text-white/45">
              感谢你的支持，打赏将用于站点与服务器维护
            </DialogDescription>
          </DialogHeader>

          <div className="mt-6 flex flex-col items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-8 text-center">
            {DONATE_URL ? (
              <>
                <Heart className="size-10 text-[#64c6f4]" />
                <p className="text-base text-white/85">将前往爱发电完成打赏</p>
                <p className="text-sm text-white/45">
                  支持微信与支付宝，金额与订单均由爱发电处理。
                </p>
              </>
            ) : (
              <>
                <CircleAlert className="size-9 text-[#ffd166]" />
                <p className="text-sm text-[#ffd166]">打赏页尚未配置，请稍后再来。</p>
              </>
            )}
          </div>

          <DialogFooter className="mt-4">
            <Button
              type="button"
              variant="ghost"
              className="text-white/60 hover:bg-white/10 hover:text-white"
              onClick={() => onOpenChange(false)}
            >
              关闭
            </Button>
            {DONATE_URL && (
              <Button asChild className="bg-[#0295e5] text-white hover:bg-[#0295e5]/90">
                <a
                  href={DONATE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => {
                    trackEvent('donate-open-afdian');
                    onOpenChange(false);
                  }}
                >
                  <ExternalLink className="size-4" />
                  前往爱发电
                </a>
              </Button>
            )}
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
};
