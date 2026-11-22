'use client';

import React, { useEffect, useRef, useState } from 'react';

import { CircleAlert, CircleCheck, Loader2, QrCode, Wallet } from 'lucide-react';

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
import { trackDonationRevenue } from './revenue';
import type {
  CreateDonationResponse,
  DonateChannel,
  DonateConfig,
  DonateResult,
  DonationMode,
  WechatJsapiPaymentParams,
} from '../types';
import { cn } from '@/lib/utils';
import { DONATION_MAX_AMOUNT, DONATION_MIN_AMOUNT } from '@/lib/site';
import { captureException, trackEvent } from '@/utils/umami';

const CHANNELS = [
  { id: 'alipay', label: '支付宝', hint: '使用支付宝扫码支付' },
  { id: 'wechat', label: '微信支付', hint: '使用微信扫码支付' },
] as const satisfies ReadonlyArray<{
  id: DonateChannel;
  label: string;
  hint: string;
}>;

const PAYMENT_TIMEOUT_MS = 5 * 60_000;
const DONATE_DRAFT_KEY = 'donate-draft';

interface WeixinJsBridge {
  invoke(
    api: string,
    params: Record<string, string>,
    callback: (result: { err_msg?: string }) => void,
  ): void;
}

function getWeixinBridge(): WeixinJsBridge | null {
  return (window as unknown as { WeixinJSBridge?: WeixinJsBridge }).WeixinJSBridge ?? null;
}

/** 拉起微信内置浏览器收银台；bridge 尚未注入时等待 WeixinJSBridgeReady */
function invokeWechatPay(params: WechatJsapiPaymentParams): Promise<'ok' | 'cancel'> {
  return new Promise((resolve, reject) => {
    let settled = false;
    let timeout: number | undefined;

    function finish(action: () => void) {
      if (settled) return;
      settled = true;
      if (timeout !== undefined) window.clearTimeout(timeout);
      document.removeEventListener('WeixinJSBridgeReady', onReady);
      action();
    }

    function run(bridge: WeixinJsBridge) {
      bridge.invoke('getBrandWCPayRequest', { ...params }, (result) => {
        if (result.err_msg === 'get_brand_wcpay_request:ok') {
          finish(() => resolve('ok'));
        } else if (result.err_msg === 'get_brand_wcpay_request:cancel') {
          finish(() => resolve('cancel'));
        } else {
          finish(() => reject(new Error('微信支付未完成')));
        }
      });
    }

    function onReady() {
      const bridge = getWeixinBridge();
      if (bridge) {
        run(bridge);
      } else {
        finish(() => reject(new Error('微信支付环境不可用')));
      }
    }

    const bridge = getWeixinBridge();
    if (bridge) {
      run(bridge);
      return;
    }

    timeout = window.setTimeout(
      () => finish(() => reject(new Error('微信支付环境加载超时'))),
      8_000,
    );
    document.addEventListener('WeixinJSBridgeReady', onReady, { once: true });
  });
}

type Phase = 'idle' | 'creating' | 'waiting' | 'paid' | 'error';

interface IDonateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 支付宝 H5 支付回跳时携带的结果 */
  result?: DonateResult | null;
}

export const DonateDialog: React.FC<IDonateDialogProps> = ({
  open,
  onOpenChange,
  result,
}) => {
  const [config, setConfig] = useState<DonateConfig | null>(null);
  const [configState, setConfigState] = useState<'loading' | 'ready' | 'error'>(
    'loading',
  );
  const [configRetry, setConfigRetry] = useState(0);
  const [channel, setChannel] = useState<DonateChannel>('alipay');
  const [customAmount, setCustomAmount] = useState('');
  const [phase, setPhase] = useState<Phase>('idle');
  const [order, setOrder] = useState<CreateDonationResponse | null>(null);
  const [orderMode, setOrderMode] = useState<DonationMode | null>(null);
  const [isWechat, setIsWechat] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [returnState, setReturnState] = useState<
    'verifying' | 'paid' | 'cancelled' | 'error'
  >('verifying');
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [qrFailed, setQrFailed] = useState(false);
  const [message, setMessage] = useState('');
  /** 用于丢弃切换渠道/关闭弹窗后返回的旧下单结果 */
  const requestSeq = useRef(0);

  const amount = Number(customAmount);
  const amountValid =
    Number.isInteger(amount) && amount >= DONATION_MIN_AMOUNT && amount <= DONATION_MAX_AMOUNT;
  const configured = configState === 'ready' && (config?.channels[channel] ?? false);
  const wechatJsapi = configState === 'ready' && (config?.wechatJsapi ?? false);
  /** 微信内置浏览器且已配置 AppSecret 时走 JSAPI，否则用扫码 */
  const useJsapi = channel === 'wechat' && isWechat && wechatJsapi;

  useEffect(() => {
    const ua = window.navigator.userAgent;
    const wechat = /MicroMessenger/i.test(ua);
    setIsWechat(wechat);
    setIsMobile(/Android|iPhone|iPad|iPod|Mobile|HarmonyOS/i.test(ua));
    if (wechat) setChannel('wechat');
  }, []);

  useEffect(() => {
    if (!open || !result) return;

    if (result.status === 'cancel') {
      setReturnState('cancelled');
      return;
    }

    const token = result.token;
    if (!token) {
      setReturnState('paid');
      return;
    }

    let active = true;
    let attempts = 0;
    let timer: number | undefined;
    setReturnState('verifying');

    const check = () => {
      queryDonation(token)
        .then((next) => {
          if (!active) return;
          if (next.status === 'paid') {
            trackDonationRevenue({
              orderId: next.orderId,
              amount: next.amount,
              channel: next.channel,
            });
            setReturnState('paid');
            return;
          }
          if (next.status === 'closed') {
            setReturnState('cancelled');
            return;
          }
          attempts += 1;
          if (attempts >= 5) {
            setReturnState('error');
            return;
          }
          timer = window.setTimeout(check, 2_000);
        })
        .catch(() => {
          if (!active) return;
          attempts += 1;
          if (attempts >= 5) {
            setReturnState('error');
            return;
          }
          timer = window.setTimeout(check, 2_000);
        });
    };

    check();

    return () => {
      active = false;
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, [open, result]);

  useEffect(() => {
    if (!open) return;

    // 授权跳转前保存的填写内容，回到页面后自动恢复
    try {
      const raw = sessionStorage.getItem(DONATE_DRAFT_KEY);
      if (!raw) return;
      sessionStorage.removeItem(DONATE_DRAFT_KEY);
      const draft = JSON.parse(raw) as { channel?: DonateChannel; amount?: number };
      if (draft.channel && CHANNELS.some((item) => item.id === draft.channel)) {
        setChannel(draft.channel);
      }
      if (
        typeof draft.amount === 'number' &&
        draft.amount >= DONATION_MIN_AMOUNT &&
        draft.amount <= DONATION_MAX_AMOUNT
      ) {
        setCustomAmount(String(draft.amount));
      }
    } catch {
      // 隐私模式下存储不可用，忽略即可
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;

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
  }, [open, configRetry]);

  useEffect(() => {
    if (!order?.codeUrl) {
      setQrDataUrl('');
      return;
    }

    let active = true;
    setQrFailed(false);
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
        if (!active) return;
        setQrDataUrl('');
        setQrFailed(true);
      });

    return () => {
      active = false;
    };
  }, [order]);

  useEffect(() => {
    if (phase !== 'waiting' || !order) return;

    let active = true;
    const deadline = Date.now() + PAYMENT_TIMEOUT_MS;
    const timer = window.setInterval(() => {
      if (Date.now() > deadline) {
        window.clearInterval(timer);
        setPhase('error');
        setMessage('支付超时，请重新生成支付码');
        trackEvent('donate-result', { status: 'timeout' });
        return;
      }

      queryDonation(order.statusToken)
        .then((result) => {
          if (!active) return;
          if (result.status === 'paid') {
            window.clearInterval(timer);
            trackDonationRevenue({
              orderId: result.orderId,
              amount: result.amount,
              channel: result.channel,
            });
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
    requestSeq.current += 1;
    setPhase('idle');
    setOrder(null);
    setOrderMode(null);
    setQrDataUrl('');
    setQrFailed(false);
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
    trackEvent('donate-create', { channel, mode: useJsapi ? 'jsapi' : 'native' });

    try {
      const result = await createDonation({
        channel,
        amount,
        mode: useJsapi ? 'jsapi' : undefined,
      });
      // 期间切换了渠道或关闭了弹窗，丢弃旧结果
      if (seq !== requestSeq.current) return;

      if (result.payment) {
        // 微信内：直接拉起收银台，支付结果仍以服务端轮询为准
        setOrder(result);
        setOrderMode('jsapi');
        try {
          const outcome = await invokeWechatPay(result.payment);
          if (seq !== requestSeq.current) return;
          if (outcome === 'cancel') {
            setMessage('已取消支付，可重新发起');
            setPhase('error');
            trackEvent('donate-result', { status: 'cancel' });
            return;
          }
          setPhase('waiting');
        } catch (paymentError) {
          if (seq !== requestSeq.current) return;
          captureException(paymentError, { feature: 'donate-wechat-jsapi' });
          setMessage('微信支付未能拉起，请重试');
          setPhase('error');
        }
        return;
      }

      if (result.redirectUrl) {
        window.location.assign(result.redirectUrl);
        return;
      }

      if (!result.codeUrl) {
        setMessage('支付信息缺失，请稍后重试');
        setPhase('error');
        return;
      }

      setOrder(result);
      setOrderMode('native');
      setPhase('waiting');
    } catch (error) {
      if (seq !== requestSeq.current) return;

      if (error instanceof DonateError && error.code === 'WECHAT_OAUTH_REQUIRED') {
        // 保存填写内容，授权跳回后自动恢复并重新打开弹窗
        try {
          sessionStorage.setItem(DONATE_DRAFT_KEY, JSON.stringify({ channel, amount }));
        } catch {
          // 存储不可用时仍继续授权，返回后需重新填写
        }
        const redirect = `${window.location.pathname}${window.location.search}`;
        window.location.assign(
          `/api/donate/wechat/oauth?redirect=${encodeURIComponent(redirect)}`,
        );
        return;
      }

      captureException(error, { feature: 'donate-create' });
      setMessage(error instanceof DonateError ? error.message : '下单失败，请稍后重试');
      setPhase('error');
    }
  };

  const activeChannel = CHANNELS.find((item) => item.id === channel) ?? CHANNELS[0];
  const alipayMobile = channel === 'alipay' && isMobile;
  const wechatMobileH5 = channel === 'wechat' && isMobile && !isWechat;
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
        // 关闭后不把焦点还给打赏按钮，否则会重新出现焦点框
        onCloseAutoFocus={(event) => event.preventDefault()}
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
            <div className="mt-6 flex flex-col items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-6 text-center">
              {returnState === 'verifying' ? (
                <>
                  <Loader2 className="size-9 animate-spin text-[#64c6f4]" />
                  <p className="text-sm text-white/60">正在确认支付结果，请稍候…</p>
                </>
              ) : returnState === 'paid' ? (
                <>
                  <CircleCheck className="size-10 text-[#64c6f4]" />
                  <p className="text-sm text-[#64c6f4]">支付成功，感谢你的支持！</p>
                </>
              ) : returnState === 'cancelled' ? (
                <>
                  <CircleAlert className="size-9 text-[#ffd166]" />
                  <p className="text-sm text-white/60">支付已取消</p>
                </>
              ) : (
                <>
                  <CircleAlert className="size-9 text-[#ff8a8a]" />
                  <p className="text-sm text-white/70">
                    暂未确认到支付结果，如已付款请稍后重新打开页面查看
                  </p>
                </>
              )}
            </div>
          ) : (
          <div className="mt-4 space-y-4">
            <div>
              <p className="mb-2 text-sm text-white/70">支付方式</p>
              <div className="grid grid-cols-2 gap-2">
                {CHANNELS.map(({ id, label, hint }) => {
                  const available = configState === 'ready' && (config?.channels[id] ?? false);
                  const selected = id === channel;
                  const hintText =
                    id === 'wechat'
                      ? isWechat && wechatJsapi
                        ? '在微信内直接完成支付'
                        : isMobile
                          ? '跳转微信完成支付'
                          : hint
                      : isMobile
                        ? '跳转支付宝完成支付'
                        : hint;
                  return (
                    <button
                      key={id}
                      type="button"
                      aria-pressed={selected}
                      title={hintText}
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
                id="donation-amount"
                name="amount"
                type="number"
                inputMode="numeric"
                min={DONATION_MIN_AMOUNT}
                max={DONATION_MAX_AMOUNT}
                step={1}
                value={customAmount}
                onChange={(event) => setCustomAmount(event.target.value)}
                placeholder={`输入金额（${DONATION_MIN_AMOUNT}–${DONATION_MAX_AMOUNT}）`}
                className="border-white/15 bg-white/5 text-white placeholder:text-white/35 focus-visible:border-[#0295e5] focus-visible:ring-[#0295e5]/20"
              />
            </div>

            {phase === 'waiting' || phase === 'paid' ? (
              <div className="flex flex-col items-center gap-2 rounded-xl border border-white/10 bg-white/5 p-4">
                {phase === 'paid' ? (
                  <>
                    <CircleCheck className="size-10 text-[#64c6f4]" />
                    <p className="text-sm text-[#64c6f4]">支付成功，感谢你的支持！</p>
                  </>
                ) : orderMode === 'jsapi' ? (
                  <>
                    <Loader2 className="size-8 animate-spin text-[#64c6f4]" />
                    <p className="text-sm text-white/60">
                      支付完成后将自动确认，请稍候…
                    </p>
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
                    ) : qrFailed ? (
                      <div className="flex size-44 flex-col items-center justify-center gap-2 rounded-lg bg-white/10 px-3 text-center">
                        <CircleAlert className="size-6 text-[#ff8a8a]" />
                        <span className="text-xs text-white/60">
                          二维码生成失败，请重新生成
                        </span>
                      </div>
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
                {configState === 'ready' && !configured && (
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
          )}

          <DialogFooter className="mt-4">
            <Button
              type="button"
              variant="ghost"
              className="text-white/60 hover:bg-white/10 hover:text-white"
              onClick={() => handleOpenChange(false)}
            >
              关闭
            </Button>
            {result || phase === 'paid' ? (
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
                    重新发起
                  </>
                ) : useJsapi ? (
                  <>
                    <Wallet className="size-4" />
                    立即支付
                  </>
                ) : alipayMobile || wechatMobileH5 ? (
                  <>
                    <Wallet className="size-4" />
                    {alipayMobile ? '前往支付宝' : '前往微信支付'}
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
