'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

import {
  IconCircleAlert,
  IconCircleCheck,
  IconExternalLink,
  IconLoader,
  IconQrCode,
  IconWallet,
} from '@/components/icons';

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

import { capturePaypalDonation, createDonation, DonateError, fetchDonateConfig, queryDonation } from './client';
import { trackDonationRevenue } from './analytics';
import type {
  CreateDonationResponse,
  DonateChannel,
  DonateConfig,
  DonateResult,
  DonationMode,
  WechatJsapiPaymentParams,
} from './types';
import { cn } from '@/lib/utils';
import {
  DONATION_MAX_AMOUNT,
  DONATION_MIN_AMOUNT,
  PAYPAL_CURRENCY,
  PAYPAL_MAX_AMOUNT,
  PAYPAL_MIN_AMOUNT,
} from '@/config/site';
import { captureException, trackEvent } from '@/lib/umami';

const CHANNELS = [
  { id: 'alipay', label: '支付宝', hint: '使用支付宝扫码支付' },
  { id: 'wechat', label: '微信支付', hint: '使用微信扫码支付' },
  { id: 'paypal', label: 'PayPal', hint: 'PayPal 余额 / 银行卡 / 信用卡支付' },
] as const satisfies ReadonlyArray<{
  id: DonateChannel;
  label: string;
  hint: string;
}>;

const PAYMENT_TIMEOUT_MS = 5 * 60_000;
const DONATE_DRAFT_KEY = 'donate-draft';

function readDonateDraft(): { channel?: DonateChannel; amount?: number } {
  try {
    const raw = sessionStorage.getItem(DONATE_DRAFT_KEY);
    if (!raw) return {};

    const draft = JSON.parse(raw) as { channel?: DonateChannel; amount?: number };
    const channel =
      draft.channel && CHANNELS.some((item) => item.id === draft.channel)
        ? draft.channel
        : undefined;
    const bounds =
      draft.channel === 'paypal'
        ? [PAYPAL_MIN_AMOUNT, PAYPAL_MAX_AMOUNT]
        : [DONATION_MIN_AMOUNT, DONATION_MAX_AMOUNT];
    const amount =
      typeof draft.amount === 'number' && draft.amount >= bounds[0] && draft.amount <= bounds[1]
        ? draft.amount
        : undefined;

    return { channel, amount };
  } catch {
    return {};
  }
}

/* ── PayPal JS SDK：脚本加载与类型（仅声明用到的 Buttons 子集） ────── */

interface PayPalButtonsConfig {
  style?: Record<string, string | number>;
  createOrder: () => Promise<string>;
  onApprove: (data: { orderID: string }) => Promise<void>;
  onCancel?: () => void;
  onError?: (error: unknown) => void;
}

interface PayPalButtons {
  render(host: HTMLElement): Promise<void>;
  close(): void;
}

interface PayPalSdk {
  Buttons(config: PayPalButtonsConfig): PayPalButtons;
}

declare global {
  interface Window {
    paypal?: PayPalSdk;
  }
}

const paypalSdkCache = new Map<string, Promise<PayPalSdk>>();

/** 按需加载 PayPal JS SDK；同一 client-id + 币种只加载一次 */
function loadPaypalSdk(clientId: string, currency: string): Promise<PayPalSdk> {
  const key = `${clientId}|${currency}`;
  const cached = paypalSdkCache.get(key);
  if (cached) return cached;

  const promise = new Promise<PayPalSdk>((resolve, reject) => {
    const script = document.createElement('script');
    script.src =
      `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(clientId)}` +
      `&currency=${encodeURIComponent(currency)}&intent=capture&components=buttons&disable-funding=credit`;
    script.async = true;
    script.onload = () => {
      if (window.paypal) resolve(window.paypal);
      else reject(new Error('PayPal SDK 未初始化'));
    };
    script.onerror = () => reject(new Error('PayPal SDK 加载失败'));
    document.head.appendChild(script);
  });

  paypalSdkCache.set(key, promise);
  return promise;
}

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
  const router = useRouter();
  const [config, setConfig] = useState<DonateConfig | null>(null);
  const [configStatus, setConfigStatus] = useState<{
    retry: number;
    state: 'loading' | 'ready' | 'error';
  }>({ retry: 0, state: 'loading' });
  const [configRetry, setConfigRetry] = useState(0);
  const [environment] = useState(() => {
    const ua = typeof window === 'undefined' ? '' : window.navigator.userAgent;
    return {
      isWechat: /MicroMessenger/i.test(ua),
      isMobile: /Android|iPhone|iPad|iPod|Mobile|HarmonyOS/i.test(ua),
    };
  });
  // 授权跳转前保存的填写内容，回到页面后自动恢复
  const [draft] = useState(readDonateDraft);
  const [channel, setChannel] = useState<DonateChannel>(
    draft.channel ?? (environment.isWechat ? 'wechat' : 'alipay'),
  );
  const [customAmount, setCustomAmount] = useState(
    draft.amount === undefined ? '' : String(draft.amount),
  );
  const [phase, setPhase] = useState<Phase>('idle');
  const [order, setOrder] = useState<CreateDonationResponse | null>(null);
  const [orderMode, setOrderMode] = useState<DonationMode | null>(null);
  const [polledReturnState, setPolledReturnState] = useState<{
    token: string;
    state: 'paid' | 'refunded' | 'cancelled' | 'error';
  } | null>(null);
  const [qrState, setQrState] = useState<{
    codeUrl: string;
    dataUrl: string;
    failed: boolean;
  } | null>(null);
  const [message, setMessage] = useState('');
  /** PayPal JS SDK 状态：按钮渲染前的加载反馈 */
  const [paypalSdkResult, setPaypalSdkResult] = useState<{
    clientId: string;
    sdk: PayPalSdk | null;
    state: 'ready' | 'error';
  } | null>(null);
  /** 用于丢弃切换渠道/关闭弹窗后返回的旧下单结果 */
  const requestSeq = useRef(0);
  const paypalHostRef = useRef<HTMLDivElement | null>(null);
  const paypalButtonsRef = useRef<PayPalButtons | null>(null);
  /** PayPal Buttons 的 createOrder 闭包在渲染时固定，金额变化需经 ref 读取 */
  const amountRef = useRef('');

  const amount = Number(customAmount);
  const isPaypal = channel === 'paypal';
  const isWechat = environment.isWechat;
  const isMobile = environment.isMobile;
  const configState = configStatus.retry === configRetry ? configStatus.state : 'loading';
  const paypalClientId = config?.paypalClientId ?? null;
  const paypalSdk = paypalSdkResult?.clientId === paypalClientId ? paypalSdkResult.sdk : null;
  const paypalSdkState =
    paypalSdkResult?.clientId === paypalClientId ? paypalSdkResult.state : 'loading';
  const minAmount = isPaypal ? PAYPAL_MIN_AMOUNT : DONATION_MIN_AMOUNT;
  const maxAmount = isPaypal ? PAYPAL_MAX_AMOUNT : DONATION_MAX_AMOUNT;
  const amountValid = isPaypal
    ? Number.isFinite(amount) &&
      amount >= minAmount &&
      amount <= maxAmount &&
      Math.abs(amount * 100 - Math.round(amount * 100)) < 1e-6
    : Number.isInteger(amount) && amount >= minAmount && amount <= maxAmount;
  const configured = configState === 'ready' && (config?.channels[channel] ?? false);
  const wechatJsapi = configState === 'ready' && (config?.wechatJsapi ?? false);
  /** 微信内置浏览器且已配置 AppSecret 时走 JSAPI，否则用扫码 */
  const useJsapi = channel === 'wechat' && isWechat && wechatJsapi;
  /** 微信内未配置 JSAPI：微信会拦截 H5 支付，提示改用浏览器打开 */
  const wechatBlocked = channel === 'wechat' && isWechat && configured && !wechatJsapi;
  const returnState =
    result?.status === 'cancel'
      ? 'cancelled'
      : result && !result.token
        ? 'error'
        : polledReturnState && polledReturnState.token === result?.token
          ? polledReturnState.state
          : 'verifying';
  const qrDataUrl = qrState?.codeUrl === order?.codeUrl ? qrState?.dataUrl ?? '' : '';
  const qrFailed = qrState?.codeUrl === order?.codeUrl ? qrState?.failed ?? false : false;

  useEffect(() => {
    if (!open || !result || result.status === 'cancel' || !result.token) return;

    const token = result.token;

    let active = true;
    let attempts = 0;
    let timer: number | undefined;

    // 指数退避：2s → 4s → 8s → ... 上限 60s
    const getDelay = () => Math.min(2000 * 2 ** attempts, 60_000);

    const check = () => {
      // 页面不可见时暂停轮询，节省资源
      if (typeof document !== 'undefined' && document.hidden) {
        timer = window.setTimeout(check, getDelay());
        return;
      }

      queryDonation(token)
        .then((next) => {
          if (!active) return;
          if (next.status === 'paid') {
            trackDonationRevenue({
              orderId: next.orderId,
              amount: next.amount,
              channel: next.channel,
            });
            setPolledReturnState({ token, state: 'paid' });
            return;
          }
          if (next.status === 'refunded') {
            // 退款成功：不记收入，显示退款状态
            setPolledReturnState({ token, state: 'refunded' });
            return;
          }
          if (next.status === 'closed') {
            setPolledReturnState({ token, state: 'cancelled' });
            return;
          }
          attempts += 1;
          if (attempts >= 30) {
            // 最多轮询 30 次（约 10 分钟）
            setPolledReturnState({ token, state: 'error' });
            return;
          }
          timer = window.setTimeout(check, getDelay());
        })
        .catch(() => {
          if (!active) return;
          attempts += 1;
          if (attempts >= 30) {
            setPolledReturnState({ token, state: 'error' });
            return;
          }
          timer = window.setTimeout(check, getDelay());
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

    try {
      sessionStorage.removeItem(DONATE_DRAFT_KEY);
    } catch {
      // 隐私模式下存储不可用，忽略即可
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;

    let active = true;
    fetchDonateConfig()
      .then((next) => {
        if (!active) return;
        setConfig(next);
        setConfigStatus({ retry: configRetry, state: 'ready' });
      })
      .catch(() => {
        if (!active) return;
        setConfig(null);
        setConfigStatus({ retry: configRetry, state: 'error' });
      });

    return () => {
      active = false;
    };
  }, [open, configRetry]);

  useEffect(() => {
    const codeUrl = order?.codeUrl;
    if (!codeUrl) return;

    let active = true;
    void import('qrcode')
      .then(({ toDataURL }) =>
        toDataURL(codeUrl, {
          margin: 1,
          width: 240,
          color: { dark: '#0b0e12', light: '#ffffff' },
        }),
      )
      .then((url) => {
        if (active) setQrState({ codeUrl, dataUrl: url, failed: false });
      })
      .catch(() => {
        if (!active) return;
        setQrState({ codeUrl, dataUrl: '', failed: true });
      });

    return () => {
      active = false;
    };
  }, [order]);

  // PayPal 金额经 ref 传给 SDK 闭包，避免按钮因金额输入频繁重建
  useEffect(() => {
    amountRef.current = customAmount;
  }, [customAmount]);

  // 选中 PayPal 且已配置时加载 JS SDK
  useEffect(() => {
    if (!open || !isPaypal || !paypalClientId) return;

    let active = true;
    loadPaypalSdk(paypalClientId, PAYPAL_CURRENCY)
      .then((sdk) => {
        if (!active) return;
        setPaypalSdkResult({ clientId: paypalClientId, sdk, state: 'ready' });
      })
      .catch(() => {
        if (!active) return;
        setPaypalSdkResult({ clientId: paypalClientId, sdk: null, state: 'error' });
        setMessage('PayPal 组件加载失败，请检查网络后重试');
      });

    return () => {
      active = false;
    };
  }, [open, isPaypal, paypalClientId]);

  // 渲染 PayPal Buttons：仅在待发起支付（idle）时挂载，切换渠道/重置后由 close() 清理
  useEffect(() => {
    const host = paypalHostRef.current;
    if (!isPaypal || !paypalSdk || paypalSdkState !== 'ready' || phase !== 'idle' || !host) return;

    host.innerHTML = '';
    const buttons = paypalSdk.Buttons({
      style: { color: 'gold', shape: 'pill', label: 'paypal', height: 42 },
      createOrder: async () => {
        const value = Number(amountRef.current);
        if (
          !Number.isFinite(value) ||
          value < PAYPAL_MIN_AMOUNT ||
          value > PAYPAL_MAX_AMOUNT ||
          Math.abs(value * 100 - Math.round(value * 100)) > 1e-6
        ) {
          setMessage(
            `请输入 ${PAYPAL_MIN_AMOUNT}–${PAYPAL_MAX_AMOUNT} ${PAYPAL_CURRENCY} 范围内的金额`,
          );
          throw new Error('invalid-amount');
        }
        try {
          trackEvent('donate-create', { channel: 'paypal' });
          const created = await createDonation({ channel: 'paypal', amount: value });
          if (!created.paypalOrderId) {
            throw new Error('missing-paypal-order');
          }
          return created.paypalOrderId;
        } catch (error) {
          // SDK 会吞掉 createOrder 的拒绝原因，这里先把具体错误展示出来
          setMessage(error instanceof DonateError ? error.message : '下单失败，请稍后重试');
          throw error;
        }
      },
      onApprove: async (data) => {
        setPhase('waiting');
        try {
          const captured = await capturePaypalDonation(data.orderID);
          if (captured.status === 'paid') {
            trackDonationRevenue({
              orderId: captured.orderId,
              amount: Number(amountRef.current),
              channel: 'paypal',
            });
            setPhase('paid');
            trackEvent('donate-result', { status: 'paid' });
          } else {
            setMessage('支付未完成，请更换支付方式后重试');
            setPhase('idle');
          }
        } catch (error) {
          captureException(error, { feature: 'donate-paypal-capture' });
          setMessage(error instanceof DonateError ? error.message : '确认支付失败，请稍后重试');
          setPhase('idle');
        }
      },
      onCancel: () => {
        setMessage('已取消支付');
        setPhase('idle');
      },
      onError: (error) => {
        captureException(error, { feature: 'donate-paypal-buttons' });
        setMessage('PayPal 支付未完成，请稍后重试');
        setPhase('idle');
      },
    });

    void buttons.render(host).catch(() => {
      setMessage('PayPal 组件渲染失败，请刷新后重试');
    });
    paypalButtonsRef.current = buttons;

    return () => {
      try {
        paypalButtonsRef.current?.close();
      } catch {
        // SDK 内部状态异常时忽略，容器随后会被清空
      }
      paypalButtonsRef.current = null;
      host.innerHTML = '';
    };
  }, [isPaypal, paypalSdk, paypalSdkState, phase, configured]);

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
    setQrState(null);
    setMessage('');
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) reset();
    onOpenChange(nextOpen);
  };

  const handleCreate = async () => {
    if (wechatBlocked || !configured || !amountValid) return;

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
        router.push(`/api/donate/wechat/oauth?redirect=${encodeURIComponent(redirect)}`);
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
            <DialogTitle className="font-playful text-xl tracking-wide text-white/90">
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
                  <IconLoader className="size-9 animate-spin text-[#64c6f4]" />
                  <p className="text-sm text-white/60">正在确认支付结果，请稍候…</p>
                </>
              ) : returnState === 'paid' ? (
                <>
                  <IconCircleCheck className="size-10 text-[#64c6f4]" />
                  <p className="text-sm text-[#64c6f4]">支付成功，感谢你的支持！</p>
                </>
              ) : returnState === 'refunded' ? (
                <>
                  <IconCircleAlert className="size-9 text-[#ffd166]" />
                  <p className="text-sm text-white/60">该笔打赏已退款</p>
                </>
              ) : returnState === 'cancelled' ? (
                <>
                  <IconCircleAlert className="size-9 text-[#ffd166]" />
                  <p className="text-sm text-white/60">支付已取消</p>
                </>
              ) : (
                <>
                  <IconCircleAlert className="size-9 text-[#ff8a8a]" />
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
              <div className="grid grid-cols-3 gap-2">
                {CHANNELS.map(({ id, label, hint }) => {
                  const available = configState === 'ready' && (config?.channels[id] ?? false);
                  const selected = id === channel;
                  const hintText =
                    id === 'wechat'
                      ? isWechat && wechatJsapi
                        ? '在微信内直接完成支付'
                        : isWechat
                          ? '需在浏览器中打开后支付'
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

            {wechatBlocked && (
              <div className="flex items-start gap-3 rounded-xl border border-[#64c6f4]/25 bg-[#64c6f4]/10 p-4">
                <IconExternalLink className="mt-0.5 size-4 shrink-0 text-[#64c6f4]" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-white/85">请在浏览器中打开后支付</p>
                  <p className="text-xs leading-relaxed text-white/50">
                    微信内置浏览器暂不支持直接支付。点击右上角「···」，选择「在浏览器打开」，再回到本页完成打赏。
                  </p>
                </div>
              </div>
            )}

            <div>
              <p className="mb-2 text-sm text-white/70">
                打赏金额（{isPaypal ? PAYPAL_CURRENCY : '元'}）
              </p>
              <Input
                id="donation-amount"
                name="amount"
                type="number"
                inputMode="numeric"
                min={minAmount}
                max={maxAmount}
                step={isPaypal ? 0.01 : 1}
                value={customAmount}
                onChange={(event) => setCustomAmount(event.target.value)}
                placeholder={`输入金额（${minAmount}–${maxAmount}）`}
                className="border-white/15 bg-white/5 text-white placeholder:text-white/35 focus-visible:border-[#0295e5] focus-visible:ring-[#0295e5]/20"
              />
            </div>

            {isPaypal && configured && phase === 'idle' && (
              <div className="space-y-2">
                {paypalSdkState === 'loading' && (
                  <p className="flex items-center gap-2 text-xs text-white/40">
                    <IconLoader className="size-4 animate-spin" />
                    正在加载 PayPal 支付组件…
                  </p>
                )}
                {paypalSdkState === 'error' && (
                  <p role="alert" className="flex items-center gap-2 text-xs text-[#ff8a8a]">
                    <IconCircleAlert className="size-4 shrink-0" />
                    PayPal 组件加载失败，请检查网络后重试
                  </p>
                )}
                {paypalSdkState === 'ready' && (
                  <>
                    {!amountValid && (
                      <p className="text-xs text-white/40">
                        请先输入 {minAmount}–{maxAmount} {PAYPAL_CURRENCY} 范围内的金额
                      </p>
                    )}
                    {/* PayPal Buttons 渲染容器；SDK 就绪后常驻，金额变化不重建按钮 */}
                    <div ref={paypalHostRef} className="min-h-11" />
                  </>
                )}
              </div>
            )}

            {phase === 'waiting' || phase === 'paid' ? (
              <div className="flex flex-col items-center gap-2 rounded-xl border border-white/10 bg-white/5 p-4">
                {phase === 'paid' ? (
                  <>
                    <IconCircleCheck className="size-10 text-[#64c6f4]" />
                    <p className="text-sm text-[#64c6f4]">支付成功，感谢你的支持！</p>
                  </>
                ) : orderMode === 'jsapi' ? (
                  <>
                    <IconLoader className="size-8 animate-spin text-[#64c6f4]" />
                    <p className="text-sm text-white/60">
                      支付完成后将自动确认，请稍候…
                    </p>
                  </>
                ) : isPaypal ? (
                  <>
                    <IconLoader className="size-8 animate-spin text-[#64c6f4]" />
                    <p className="text-sm text-white/60">正在确认支付结果，请稍候…</p>
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
                        <IconCircleAlert className="size-6 text-[#ff8a8a]" />
                        <span className="text-xs text-white/60">
                          二维码生成失败，请重新生成
                        </span>
                      </div>
                    ) : (
                      <div className="flex size-44 items-center justify-center rounded-lg bg-white/10">
                        <IconLoader className="size-6 animate-spin text-white/50" />
                      </div>
                    )}
                    <p className="flex items-center gap-1.5 text-sm text-white/60">
                      <IconQrCode className="size-4" />
                      {activeChannel.hint}
                    </p>
                  </>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {configState === 'ready' && !configured && (
                  <p className="flex items-start gap-2 rounded-lg border border-[#ffd166]/20 bg-[#ffd166]/5 p-3 text-sm text-[#ffd166]">
                    <IconCircleAlert className="mt-0.5 size-4 shrink-0" />
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
                <IconCircleCheck className="size-4" />
                完成
              </Button>
            ) : isPaypal ? (
              // PayPal 渠道由内嵌 Buttons 发起支付，无独立提交按钮
              <></>
            ) : (
              <Button
                type="button"
                onClick={handleCreate}
                disabled={!configured || !amountValid || submitting || wechatBlocked}
                className="bg-[#0295e5] text-white shadow-[0_8px_24px_-8px_rgba(2_149_229_0.5)] hover:bg-[#0295e5]/90"
              >
                {phase === 'creating' ? (
                  <>
                    <IconLoader className="size-4 animate-spin" />
                    生成中…
                  </>
                ) : phase === 'waiting' ? (
                  <>
                    <IconLoader className="size-4 animate-spin" />
                    等待支付…
                  </>
                ) : phase === 'error' ? (
                  <>
                    <IconCircleAlert className="size-4" />
                    重新发起
                  </>
                ) : wechatBlocked ? (
                  <>
                    <IconExternalLink className="size-4" />
                    请用浏览器打开
                  </>
                ) : useJsapi ? (
                  <>
                    <IconWallet className="size-4" />
                    立即支付
                  </>
                ) : alipayMobile || wechatMobileH5 ? (
                  <>
                    <IconWallet className="size-4" />
                    {alipayMobile ? '前往支付宝' : '前往微信支付'}
                  </>
                ) : (
                  <>
                    <IconQrCode className="size-4" />
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
