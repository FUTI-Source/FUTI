import { getNotifyEnv } from '@/config/env';
import { isHttpUrl } from '@/lib/http/url';
import { logger } from '@/lib/logger';
import { SITE_NOTIFICATION_ICON } from '@/lib/site';

const DEFAULT_SERVER_URL = 'https://api.day.app';
const REQUEST_TIMEOUT_MS = 5_000;

type BarkLevel = 'active' | 'timeSensitive' | 'passive' | 'critical';

export interface BarkMessage {
  title: string;
  subtitle?: string;
  body: string;
  group?: string;
  level?: BarkLevel;
}

/** 压平换行并截断，避免长内容把推送通知撑爆 */
export function truncateBarkBody(value: string, max = 300): string {
  const flat = value.replace(/\s+/g, ' ').trim();
  return flat.length > max ? `${flat.slice(0, max)}…` : flat;
}

/** 通过 Bark 推送通知到站长 iPhone；未配置或失败时返回原因，不向上抛出 */
export async function sendBark(message: BarkMessage): Promise<string | undefined> {
  const { barkDeviceKey, barkServerUrl } = getNotifyEnv();
  if (!barkDeviceKey) return undefined;

  const serverUrl = isHttpUrl(barkServerUrl) ? barkServerUrl : DEFAULT_SERVER_URL;

  try {
    const response = await fetch(`${serverUrl}/push`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({
        device_key: barkDeviceKey,
        title: message.title,
        subtitle: message.subtitle,
        body: message.body,
        group: message.group,
        icon: SITE_NOTIFICATION_ICON,
        level: message.level,
      }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    const text = await response.text();
    let result: { code?: number; message?: string } = {};
    try {
      result = JSON.parse(text) as typeof result;
    } catch {
      // 非 JSON 响应时保留原文用于排查
    }

    if (!response.ok || result.code !== 200) {
      throw new Error(
        `HTTP ${response.status} ${result.message ?? text.slice(0, 200)}`.trim(),
      );
    }

    logger.info('[notify] Bark 推送成功', message.title);
    return undefined;
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    logger.error('[notify] Bark 推送失败', reason);
    return reason;
  }
}
