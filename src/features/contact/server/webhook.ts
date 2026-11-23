import { sendBark, truncateBarkBody } from '@/lib/bark';
import { SITE_NAME, SITE_URL } from '@/lib/site';

import type { ContactRequest, ContactResponse } from '../types';

const WEBHOOK_TIMEOUT_MS = 8_000;

function getWebhookUrl(): string | null {
  return process.env.NOTIFY_WEBHOOK_URL?.trim() || null;
}

async function postWebhook(payload: Record<string, unknown>): Promise<void> {
  const url = getWebhookUrl();
  if (!url) {
    throw new Error('通知 Webhook 尚未配置，请设置 NOTIFY_WEBHOOK_URL');
  }

  const secret = process.env.NOTIFY_WEBHOOK_SECRET?.trim();
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

/** 联系表单：Webhook 为主通道，Bark 失败不影响提交结果 */
export async function sendContactWebhook(
  dto: ContactRequest,
): Promise<ContactResponse> {
  const results = await Promise.allSettled([
    postWebhook({
      type: 'contact',
      title: '收到一条新的留言',
      site: { name: SITE_NAME, url: SITE_URL },
      email: dto.email,
      content: dto.content,
      timestamp: new Date().toISOString(),
    }),
    sendBark({
      title: `网站留言 · ${dto.email}`,
      subtitle: '来自网站联系表单',
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
  if (!getWebhookUrl()) {
    console.warn('[donate] 未配置 NOTIFY_WEBHOOK_URL，跳过 Webhook 通知');
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
