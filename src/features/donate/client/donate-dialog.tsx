'use client';

import React, { useEffect, useState } from 'react';

import { CircleAlert, CircleCheck, Loader2, QrCode } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

import { createDonation, DonateError, fetchDonateConfig, queryDonation } from './donate-api';
import type {
  CreateDonationResponse,
  DonateChannel,
  DonateChannelConfig,
} from '../types';
import { cn } from '@/lib/utils';
import { captureException, trackEvent } from '@/utils/umami';

const CHANNELS = [
  { id: 'alipay', label: '支付宝', hint: '使用支付宝扫码支付' },
  { id: 'wechat', label: '微信支付', hint: '使用微信扫码支付' },
  { id: 'applepay', label: 'Apple Pay', hint: '需 Apple 商户号与域名校验' },
] as const satisfies ReadonlyArray<{
  id: DonateChannel;
  label: string;
  hint: string;
}>;

const PRESET_AMOUNTS = [5, 10, 20, 50] as const;

type Phase = 'idle' | 'creating' | 'waiting' | 'paid' | 'error';

interface IDonateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const DonateDialog: React.FC<IDonateDialogProps> = ({ open, onOpenChange }) => {
  const [config, setConfig] = useState<DonateChannelConfig | null>(null);
  const [channel, setChannel] = useState<DonateChannel>('alipay');
  const [presetAmount, setPresetAmount] = useState<number>(10);
  const [customAmount, setCustomAmount] = useState('');
  const [phase, setPhase] = useState<Phase>('idle');
  const [order, setOrder] = useState<CreateDonationResponse | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [message, setMessage] = useState('');

  const parsedCustom = Number(customAmount);
  const amount = customAmount.trim() ? parsedCustom : presetAmount;
  const amountValid = Number.isInteger(amount) && amount >= 1 && amount <= 500;
  const configured = config?.[channel] ?? false;

  useEffect(() => {
    if (!open) return;

    let active = true;
    fetchDonateConfig()
      .then((next) => {
        if (active) setConfig(next);
      })
      .catch(() => {
        if (active) setConfig(null);
      });

    return () => {
      active = false;
    };
  }, [open]);

  useEffect(() => {
    if (!order?.codeUrl) {
      setQrDataUrl('');
      return;
    }

    let active = true;
    void import('qrcode')
      .then(({ toDataURL }) =>
        toDataURL(order.codeUrl as string, {
          margin: 1,
          width: 240,
          color: { dark: '#0b0e12', light: '#ffffff' },
        }),
      )
      .then((url) => {
        if (active) setQrDataUrl(url);
      })
      .catch(() => {
        if (active) setQrDataUrl('');
      });

    return () => {
      active = false;
    };
  }, [order]);

  useEffect(() => {
    if (phase !== 'waiting' || !order) return;

    let active = true;
    const timer = window.setInterval(() => {
      queryDonation(order.orderId)
        .then((result) => {
          if (!active) return;
          if (result.status === 'paid') {
            window.clearInterval(timer);
            setPhase('paid');
            trackEvent('donate-result', { status: 'paid' });
          } else if (result.status === 'closed') {
            window.clearInterval(timer);
            setPhase('error');
            setMessage('订单已关闭，请重新发起');
            trackEvent('donate-result', { status: 'closed' });
          }
        })
        .catch(() => {
          // 骨架阶段查询接口尚未接入，忽略轮询错误，避免反复提示
        });
    }, 3_000);

    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [phase, order]);

  const reset = () => {
    setPhase('idle');
    setOrder(null);
    setQrDataUrl('');
    setMessage('');
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) reset();
    onOpenChange(nextOpen);
  };

  const handleCreate = async () => {
    if (!configured || !amountValid) return;

    setPhase('creating');
    setMessage('');
    trackEvent('donate-create', { channel });

    try {
      const result = await createDonation({ channel, amount });
      if (result.redirectUrl) {
        window.location.assign(result.redirectUrl);
        return;
      }
      setOrder(result);
      setPhase('waiting');
    } catch (error) {
      captureException(error, { feature: 'donate-create' });
      setMessage(error instanceof DonateError ? error.message : '下单失败，请稍后重试');
      setPhase('error');
    }
  };

  const activeChannel = CHANNELS.find((item) => item.id === channel) ?? CHANNELS[0];
  const submitting = phase === 'creating' || phase === 'waiting';

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
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

          <div className="mt-4 space-y-4">
            <div>
              <p className="mb-2 text-sm text-white/70">支付方式</p>
              <div className="grid grid-cols-3 gap-2">
                {CHANNELS.map(({ id, label, hint }) => {
                  const available = config?.[id] ?? false;
                  const selected = id === channel;
                  return (
                    <button
                      key={id}
                      type="button"
                      aria-pressed={selected}
                      title={hint}
                      data-umami-event="donate-channel"
                      data-umami-event-channel={id}
                      onClick={() => {
                        setChannel(id);
                        reset();
                      }}
                      className={cn(
                        'relative flex cursor-pointer flex-col items-center gap-1 rounded-xl border px-2 py-3 text-sm transition-colors',
                        selected
                          ? 'border-[#0295e5]/60 bg-[#0295e5]/10 text-white'
                          : 'border-white/10 bg-white/5 text-white/70 hover:border-white/20 hover:text-white',
                      )}
                    >
                      <span className="font-bold">{label}</span>
                      <span className="text-[11px] text-white/35">
                        {available ? '可用' : '未配置'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <p className="mb-2 text-sm text-white/70">打赏金额（元）</p>
              <div className="grid grid-cols-4 gap-2">
                {PRESET_AMOUNTS.map((value) => {
                  const selected = !customAmount.trim() && presetAmount === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => {
                        setPresetAmount(value);
                        setCustomAmount('');
                      }}
                      className={cn(
                        'cursor-pointer rounded-lg border px-2 py-2 text-sm transition-colors',
                        selected
                          ? 'border-[#0295e5]/60 bg-[#0295e5]/10 text-white'
                          : 'border-white/10 bg-white/5 text-white/70 hover:border-white/20 hover:text-white',
                      )}
                    >
                      ¥{value}
                    </button>
                  );
                })}
              </div>
              <Input
                type="number"
                inputMode="numeric"
                min={1}
                max={500}
                step={1}
                value={customAmount}
                onChange={(event) => setCustomAmount(event.target.value)}
                placeholder="自定义金额（1–500）"
                className="mt-2 border-white/15 bg-white/5 text-white placeholder:text-white/35 focus-visible:border-[#0295e5] focus-visible:ring-[#0295e5]/20"
              />
            </div>

            {phase === 'waiting' || phase === 'paid' ? (
              <div className="flex flex-col items-center gap-2 rounded-xl border border-white/10 bg-white/5 p-4">
                {phase === 'paid' ? (
                  <>
                    <CircleCheck className="size-10 text-[#64c6f4]" />
                    <p className="text-sm text-[#64c6f4]">支付成功，感谢你的支持！</p>
                  </>
                ) : (
                  <>
                    {qrDataUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={qrDataUrl}
                        alt={`${activeChannel.label}支付二维码`}
                        width={240}
                        height={240}
                        className="size-44 rounded-lg bg-white p-1"
                      />
                    ) : (
                      <div className="flex size-44 items-center justify-center rounded-lg bg-white/10">
                        <Loader2 className="size-6 animate-spin text-white/50" />
                      </div>
                    )}
                    <p className="flex items-center gap-1.5 text-sm text-white/60">
                      <QrCode className="size-4" />
                      {activeChannel.hint}
                    </p>
                  </>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {config && !configured && (
                  <p className="flex items-start gap-2 rounded-lg border border-[#ffd166]/20 bg-[#ffd166]/5 p-3 text-sm text-[#ffd166]">
                    <CircleAlert className="mt-0.5 size-4 shrink-0" />
                    {activeChannel.label} 渠道暂未开通，站长完成商户配置后即可使用。
                  </p>
                )}
                {message && (
                  <p role="alert" className="text-sm text-[#ff8a8a]">
                    {message}
                  </p>
                )}
              </div>
            )}
          </div>

          <DialogFooter className="mt-4">
            <Button
              type="button"
              variant="ghost"
              className="text-white/60 hover:bg-white/10 hover:text-white"
              onClick={() => handleOpenChange(false)}
            >
              关闭
            </Button>
            {phase === 'paid' ? (
              <Button
                type="button"
                onClick={() => handleOpenChange(false)}
                className="bg-[#0295e5] text-white hover:bg-[#0295e5]/90"
              >
                <CircleCheck className="size-4" />
                完成
              </Button>
            ) : (
              <Button
                type="button"
                onClick={handleCreate}
                disabled={!configured || !amountValid || submitting}
                className="bg-[#0295e5] text-white shadow-[0_8px_24px_-8px_rgba(2_149_229_0.5)] hover:bg-[#0295e5]/90"
              >
                {phase === 'creating' ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    生成中…
                  </>
                ) : phase === 'waiting' ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    等待支付…
                  </>
                ) : phase === 'error' ? (
                  <>
                    <CircleAlert className="size-4" />
                    重新生成
                  </>
                ) : (
                  <>
                    <QrCode className="size-4" />
                    生成支付码
                  </>
                )}
              </Button>
            )}
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
};
