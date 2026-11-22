'use client';

import React, { useEffect, useRef, useState } from 'react';

import { CircleAlert, CircleCheck, Loader2, Wallet } from 'lucide-react';

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
import type { DonateChannel, DonateChannelConfig, DonateResult } from '../types';
import { cn } from '@/lib/utils';
import { captureException, trackEvent } from '@/utils/umami';

const CHANNELS = [
  { id: 'wechat', label: '微信支付', hint: '使用微信扫码支付' },
  { id: 'alipay', label: '支付宝', hint: '使用支付宝扫码支付' },
  { id: 'unionpay', label: '云闪付', hint: '使用云闪付扫码支付' },
] as const satisfies ReadonlyArray<{
  id: DonateChannel;
  label: string;
  hint: string;
}>;

type Phase =
  | 'idle'
  | 'creating'
  | 'error'
  | 'verifying'
  | 'success'
  | 'cancelled';

interface IDonateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 从支付渠道返回站点时携带的结果 */
  result?: DonateResult | null;
}

export const DonateDialog: React.FC<IDonateDialogProps> = ({
  open,
  onOpenChange,
  result = null,
}) => {
  const [config, setConfig] = useState<DonateChannelConfig | null>(null);
  const [configState, setConfigState] = useState<'loading' | 'ready' | 'error'>(
    'loading',
  );
  const [configRetry, setConfigRetry] = useState(0);
  const [channel, setChannel] = useState<DonateChannel>('wechat');
  const [customAmount, setCustomAmount] = useState('');
  const [phase, setPhase] = useState<Phase>('idle');
  const [message, setMessage] = useState('');
  /** 用于丢弃关闭弹窗后返回的旧下单结果 */
  const requestSeq = useRef(0);

  const amount = Number(customAmount);
  const amountValid = Number.isInteger(amount) && amount >= 1 && amount <= 10000;
  const configured = configState === 'ready' && (config?.[channel] ?? false);

  useEffect(() => {
    if (!open || result) return;

    let active = true;
    setConfigState('loading');
    fetchDonateConfig()
      .then((next) => {
        if (!active) return;
        setConfig(next);
        setConfigState('ready');
      })
      .catch(() => {
        if (!active) return;
        setConfig(null);
        setConfigState('error');
      });

    return () => {
      active = false;
    };
  }, [open, configRetry, result]);

  useEffect(() => {
    if (!open || !result) return;

    if (result.status === 'cancel') {
      setPhase('cancelled');
      setMessage('');
      return;
    }

    if (!result.orderId) {
      setPhase('success');
      return;
    }

    let active = true;
    setPhase('verifying');
    setMessage('');

    queryDonation(result.orderId)
      .then((status) => {
        if (!active) return;
        if (status.status === 'paid') {
          setPhase('success');
          trackEvent('donate-result', { status: 'paid' });
        } else {
          setPhase('error');
          setMessage('未确认到支付结果，请稍后重试');
          trackEvent('donate-result', { status: status.status });
        }
      })
      .catch(() => {
        if (!active) return;
        setPhase('error');
        setMessage('支付结果查询失败，请稍后重试');
      });

    return () => {
      active = false;
    };
  }, [open, result]);

  const reset = () => {
    requestSeq.current += 1;
    setPhase('idle');
    setMessage('');
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) reset();
    onOpenChange(nextOpen);
  };

  const handleCreate = async () => {
    if (!configured || !amountValid) return;

    const seq = ++requestSeq.current;
    setPhase('creating');
    setMessage('');
    trackEvent('donate-create', { channel });

    try {
      const result = await createDonation({ channel, amount });
      if (seq !== requestSeq.current) return;
      // 跳转到星驿付收银台完成支付
      window.location.assign(result.redirectUrl);
    } catch (error) {
      if (seq !== requestSeq.current) return;
      captureException(error, { feature: 'donate-create' });
      setMessage(error instanceof DonateError ? error.message : '下单失败，请稍后重试');
      setPhase('error');
    }
  };

  const activeChannel = CHANNELS.find((item) => item.id === channel) ?? CHANNELS[0];
  const resultPhase: Phase = result
    ? phase === 'idle'
      ? 'verifying'
      : phase
    : phase;

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

          {result ? (
            <div className="mt-6 flex flex-col items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-8 text-center">
              {resultPhase === 'success' ? (
                <>
                  <CircleCheck className="size-10 text-[#64c6f4]" />
                  <p className="text-base text-[#64c6f4]">支付成功，感谢你的支持！</p>
                </>
              ) : resultPhase === 'cancelled' ? (
                <>
                  <CircleAlert className="size-9 text-[#ffd166]" />
                  <p className="text-sm text-white/70">已取消支付</p>
                </>
              ) : resultPhase === 'error' ? (
                <>
                  <CircleAlert className="size-9 text-[#ff8a8a]" />
                  <p className="text-sm text-[#ff8a8a]">
                    {message || '支付结果查询失败，请稍后重试'}
                  </p>
                </>
              ) : (
                <>
                  <Loader2 className="size-8 animate-spin text-[#64c6f4]" />
                  <p className="text-sm text-white/60">正在确认支付结果…</p>
                </>
              )}
            </div>
          ) : (
          <div className="mt-4 space-y-4">
            <div>
              <p className="mb-2 text-sm text-white/70">支付方式</p>
              <div className="grid grid-cols-3 gap-2">
                {CHANNELS.map(({ id, label, hint }) => {
                  const available = configState === 'ready' && (config?.[id] ?? false);
                  const selected = id === channel;
                  return (
                    <button
                      key={id}
                      type="button"
                      aria-pressed={selected}
                      title={hint}
                      disabled={phase === 'creating'}
                      data-umami-event="donate-channel"
                      data-umami-event-channel={id}
                      onClick={() => {
                        setChannel(id);
                        reset();
                      }}
                      className={cn(
                        'relative flex cursor-pointer flex-col items-center gap-1 rounded-xl border px-2 py-3 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-60',
                        selected
                          ? 'border-[#0295e5]/60 bg-[#0295e5]/10 text-white'
                          : 'border-white/10 bg-white/5 text-white/70 hover:border-white/20 hover:text-white',
                      )}
                    >
                      <span className="font-bold">{label}</span>
                      <span className="text-[11px] text-white/35">
                        {configState === 'loading'
                          ? '读取中'
                          : available
                            ? '可用'
                            : '未配置'}
                      </span>
                    </button>
                  );
                })}
              </div>
              {configState === 'loading' && (
                <p role="status" className="mt-2 text-xs text-white/40">
                  正在读取支付渠道…
                </p>
              )}
              {configState === 'error' && (
                <p
                  role="alert"
                  className="mt-2 flex items-center gap-2 text-xs text-[#ff8a8a]"
                >
                  支付渠道配置加载失败。
                  <button
                    type="button"
                    onClick={() => setConfigRetry((value) => value + 1)}
                    className="cursor-pointer underline underline-offset-2 hover:text-white"
                  >
                    重试
                  </button>
                </p>
              )}
            </div>

            <div>
              <p className="mb-2 text-sm text-white/70">打赏金额（元）</p>
              <Input
                type="number"
                inputMode="numeric"
                min={1}
                max={10000}
                step={1}
                value={customAmount}
                onChange={(event) => setCustomAmount(event.target.value)}
                placeholder="输入金额（1–10000）"
                className="border-white/15 bg-white/5 text-white placeholder:text-white/35 focus-visible:border-[#0295e5] focus-visible:ring-[#0295e5]/20"
              />
            </div>

            <div className="space-y-2">
              {configState === 'ready' && !configured && (
                <p className="flex items-start gap-2 rounded-lg border border-[#ffd166]/20 bg-[#ffd166]/5 p-3 text-sm text-[#ffd166]">
                  <CircleAlert className="mt-0.5 size-4 shrink-0" />
                  {activeChannel.label} 渠道暂未开通，站长完成星驿付配置后即可使用。
                </p>
              )}
              {message && (
                <p role="alert" className="text-sm text-[#ff8a8a]">
                  {message}
                </p>
              )}
            </div>
          </div>
          )}

          {result ? (
            <DialogFooter className="mt-4">
              <Button
                type="button"
                onClick={() => handleOpenChange(false)}
                className="bg-[#0295e5] text-white hover:bg-[#0295e5]/90"
              >
                {resultPhase === 'verifying' ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    确认中…
                  </>
                ) : (
                  '完成'
                )}
              </Button>
            </DialogFooter>
          ) : (
          <DialogFooter className="mt-4">
            <Button
              type="button"
              variant="ghost"
              className="text-white/60 hover:bg-white/10 hover:text-white"
              onClick={() => handleOpenChange(false)}
            >
              关闭
            </Button>
            <Button
              type="button"
              onClick={handleCreate}
              disabled={!configured || !amountValid || phase === 'creating'}
              className="bg-[#0295e5] text-white shadow-[0_8px_24px_-8px_rgba(2_149_229_0.5)] hover:bg-[#0295e5]/90"
            >
              {phase === 'creating' ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  跳转中…
                </>
              ) : phase === 'error' ? (
                <>
                  <CircleAlert className="size-4" />
                  重试
                </>
              ) : (
                <>
                  <Wallet className="size-4" />
                  前往支付
                </>
              )}
            </Button>
          </DialogFooter>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
