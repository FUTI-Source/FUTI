import { SITE_NOTIFICATION_ICON, SITE_URL } from './site';

const DEFAULT_SERVER_URL = 'https://api.day.app';
const REQUEST_TIMEOUT_MS = 5_000;

export type BarkLevel = 'active' | 'timeSensitive' | 'passive' | 'critical';

export interface BarkMessage {
  title: string;
  subtitle?: string;
  body: string;
  group?: string;
  url?: string;
  level?: BarkLevel;
}

interface BarkConfig {
  serverUrl: string;
  deviceKey: string;
}

function getConfig(): BarkConfig | null {
  const deviceKey = process.env.BARK_DEVICE_KEY?.trim();
  if (!deviceKey) return null;

  const serverUrl = (process.env.BARK_SERVER_URL?.trim() || DEFAULT_SERVER_URL).replace(
    /\/+$/,
    '',
  );
  return { serverUrl, deviceKey };
}

/** 压平换行并截断，避免长内容把推送通知撑爆 */
export function truncateBarkBody(value: string, max = 300): string {
  const flat = value.replace(/\s+/g, ' ').trim();
  return flat.length > max ? `${flat.slice(0, max)}…` : flat;
}

/** 通过 Bark 推送通知到站长 iPhone；未配置或失败时只记录日志，不向上抛出 */
export async function sendBark(message: BarkMessage): Promise<void> {
  const config = getConfig();
  if (!config) {
    console.warn('[bark] 未配置 BARK_DEVICE_KEY，跳过推送');
    return;
  }

  try {
    const response = await fetch(`${config.serverUrl}/push`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({
        device_key: config.deviceKey,
        title: message.title,
        subtitle: message.subtitle,
        body: message.body,
        group: message.group,
        icon: SITE_NOTIFICATION_ICON,
        url: message.url,
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

    console.info('[bark] 推送成功', message.title);
  } catch (error) {
    console.error('[bark] 推送失败', error);
  }
}
