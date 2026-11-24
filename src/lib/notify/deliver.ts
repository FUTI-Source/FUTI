import { getNotifyEnv } from '@/config/env';
import { isHttpUrl } from '@/lib/http/url';
import { logger } from '@/lib/logger';

import {
  buildBotPayload,
  detectProvider,
  isWebhookBodySuccess,
  type NotificationEvent,
  type WebhookProvider,
} from './providers';

const WEBHOOK_TIMEOUT_MS = 8_000;

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function deliver(
  url: string,
  payload: NotificationEvent,
  secret: string,
  provider: WebhookProvider,
): Promise<void> {
  if (!isHttpUrl(url)) throw new Error('Webhook 地址必须是 http(s) 协议');

  // 机器人接收端按协议构造消息体；其余接收端原样发送通用 JSON
  const body = provider === 'generic' ? payload : buildBotPayload(provider, payload);

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
      body: JSON.stringify(body),
      cache: 'no-store',
      signal: controller.signal,
    });

    const detail = (await response.text().catch(() => '')).trim();

    if (!response.ok) {
      throw new Error(`Webhook 返回 ${response.status}${detail ? `：${detail.slice(0, 200)}` : ''}`);
    }

    // 机器人：HTTP 2xx 但业务码失败时，按失败处理（触发失败 Webhook / 返回 502）
    if (provider !== 'generic' && !isWebhookBodySuccess(detail)) {
      throw new Error(
        `Webhook 业务处理失败（HTTP ${response.status}）${detail ? `：${detail.slice(0, 200)}` : ''}`,
      );
    }

    logger.info('[notify] Webhook 投递成功', { provider, status: response.status });
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
  payload: NotificationEvent,
  reason: string,
): NotificationEvent {
  return {
    type: `${payload.type}.webhook_failed`,
    title: 'Webhook 投递失败',
    site: payload.site,
    timestamp: new Date().toISOString(),
    error: reason.slice(0, 500),
    original: payload,
  };
}

/**
 * 主 Webhook 投递，失败后自动改投备用地址。
 * 两者都失败时抛出聚合原因，由调用方决定是返回 502 还是只记日志。
 */
export async function postWebhook(payload: NotificationEvent): Promise<void> {
  const { webhookUrl, webhookSecret, fallbackUrl, fallbackSecret } = getNotifyEnv();

  if (!webhookUrl) {
    if (!fallbackUrl) {
      throw new Error('通知 Webhook 尚未配置，请设置 NOTIFY_WEBHOOK_URL');
    }
    await deliver(
      fallbackUrl,
      buildFailurePayload(payload, '未配置 NOTIFY_WEBHOOK_URL'),
      fallbackSecret,
      detectProvider(fallbackUrl),
    );
    return;
  }

  try {
    await deliver(webhookUrl, payload, webhookSecret, detectProvider(webhookUrl));
  } catch (primaryError) {
    if (!fallbackUrl) throw primaryError;

    try {
      await deliver(
        fallbackUrl,
        buildFailurePayload(payload, errorMessage(primaryError)),
        fallbackSecret,
        detectProvider(fallbackUrl),
      );
    } catch (fallbackError) {
      throw new Error(
        `主 Webhook 失败：${errorMessage(primaryError)}；失败 Webhook 也失败：${errorMessage(fallbackError)}`,
      );
    }
  }
}

export const isWebhookConfigured = (): boolean => {
  const { webhookUrl, fallbackUrl } = getNotifyEnv();
  return Boolean(webhookUrl || fallbackUrl);
};
