import { sendBark, truncateBarkBody } from '@/lib/bark';
import { SITE_NAME, SITE_URL } from '@/lib/site';

import type { ContactRequest, ContactResponse } from '../types';

const WEBHOOK_TIMEOUT_MS = 8_000;

function getWebhookUrl(): string | null {
  return process.env.NOTIFY_WEBHOOK_URL?.trim() || null;
}

function getFallbackUrl(): string | null {
  return process.env.NOTIFY_WEBHOOK_FALLBACK_URL?.trim() || null;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function deliver(
  url: string,
  payload: Record<string, unknown>,
  secret?: string,
): Promise<void> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), WEBHOOK_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'FUTI-Webhook/1.0',
        ...(secret ? { Authorization: `Bearer ${secret}` } : {}),
      },
      body: JSON.stringify(payload),
      cache: 'no-store',
      signal: controller.signal,
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      throw new Error(
        `Webhook 返回 ${response.status}${detail ? `：${detail.slice(0, 200)}` : ''}`,
      );
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Webhook 请求超时');
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

function buildFailurePayload(
  payload: Record<string, unknown>,
  reason: string,
): Record<string, unknown> {
  const type = typeof payload.type === 'string' ? payload.type : 'notification';

  return {
    type: `${type}.webhook_failed`,
    title: 'Webhook 投递失败',
    site: payload.site,
    error: reason.slice(0, 500),
    original: payload,
    timestamp: new Date().toISOString(),
  };
}

async function postWebhook(payload: Record<string, unknown>): Promise<void> {
  const primaryUrl = getWebhookUrl();
  const fallbackUrl = getFallbackUrl();
  const primarySecret = process.env.NOTIFY_WEBHOOK_SECRET?.trim();
  const fallbackSecret =
    process.env.NOTIFY_WEBHOOK_FALLBACK_SECRET?.trim() || primarySecret;

  if (!primaryUrl) {
    if (!fallbackUrl) {
      throw new Error('通知 Webhook 尚未配置，请设置 NOTIFY_WEBHOOK_URL');
    }

    await deliver(
      fallbackUrl,
      buildFailurePayload(payload, '未配置 NOTIFY_WEBHOOK_URL'),
      fallbackSecret,
    );
    return;
  }

  try {
    await deliver(primaryUrl, payload, primarySecret);
  } catch (primaryError) {
    if (!fallbackUrl) throw primaryError;

    try {
      await deliver(
        fallbackUrl,
        buildFailurePayload(payload, errorMessage(primaryError)),
        fallbackSecret,
      );
    } catch (fallbackError) {
      throw new Error(
        `主 Webhook 失败：${errorMessage(primaryError)}；失败 Webhook 也失败：${errorMessage(fallbackError)}`,
      );
    }
  }
}

/** 联系表单：Webhook 为主通道，Bark 失败不影响提交结果 */
export async function sendContactWebhook(
  dto: ContactRequest,
): Promise<ContactResponse> {
  const phone = dto.phone?.trim();
  const phoneWithCode = phone
    ? `${dto.phoneCountryCode?.trim() || '+86'} ${phone}`
    : null;

  const results = await Promise.allSettled([
    postWebhook({
      type: 'contact',
      title: '收到一条新的留言',
      site: { name: SITE_NAME, url: SITE_URL },
      name: dto.name,
      email: dto.email,
      phone: phoneWithCode,
      content: dto.content,
      timestamp: new Date().toISOString(),
    }),
    sendBark({
      title: `网站留言 · ${dto.name}`,
      subtitle: phoneWithCode ? `${dto.email} / ${phoneWithCode}` : dto.email,
      body: truncateBarkBody(dto.content) || '（无内容）',
      group: '网站留言',
      url: SITE_URL,
      level: 'timeSensitive',
    }),
  ]);

  const webhookResult = results[0];
  if (webhookResult.status === 'rejected') {
    throw webhookResult.reason;
  }

  const barkResult = results[1];
  if (barkResult.status === 'rejected') {
    console.warn(`[contact] Bark 推送失败：${(barkResult.reason as Error).message}`);
  }

  return { success: true };
}

/** 打赏通知：失败只记录日志，不影响支付回调 */
export async function sendDonationWebhook(input: {
  channelLabel: string;
  amountYuan?: string;
  orderId: string;
}): Promise<void> {
  if (!getWebhookUrl() && !getFallbackUrl()) {
    console.warn('[donate] 未配置通知 Webhook，跳过 Webhook 通知');
    return;
  }

  try {
    await postWebhook({
      type: 'donation',
      title: '收到一笔新打赏',
      site: { name: SITE_NAME, url: SITE_URL },
      channel: input.channelLabel,
      amount: input.amountYuan,
      orderId: input.orderId,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.warn(`[donate] Webhook 通知失败：${(error as Error).message}`);
  }
}
