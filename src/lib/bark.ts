import { SITE_URL } from './site';

const DEFAULT_SERVER_URL = 'https://api.day.app';
const REQUEST_TIMEOUT_MS = 5_000;
const DEFAULT_ICON = `${SITE_URL}/icon-192x192.png`;

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
  if (!config) return;

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
        icon: DEFAULT_ICON,
        url: message.url,
        level: message.level,
      }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const result = (await response.json()) as { code?: number; message?: string };
    if (result.code !== 200) {
      throw new Error(result.message ?? `返回 code ${result.code}`);
    }
  } catch (error) {
    console.error('[bark] 推送失败', error);
  }
}
