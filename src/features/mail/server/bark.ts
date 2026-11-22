import { SITE_MAIL_OWNER_SUBJECT_PREFIX, SITE_URL } from '@/lib/site';

import type { SendMailRequest } from '../types';

const DEFAULT_SERVER_URL = 'https://api.day.app';
const REQUEST_TIMEOUT_MS = 5_000;
/** 通知正文最大长度，避免长留言把推送撑爆 */
const MAX_BODY_LENGTH = 300;

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

function truncate(value: string, max: number): string {
  const flat = value.replace(/\s+/g, ' ').trim();
  return flat.length > max ? `${flat.slice(0, max)}…` : flat;
}

/** 收到新留言时向站长 iPhone 推送 Bark 通知；未配置或失败时静默跳过，不影响表单提交 */
export async function pushBarkMessage(dto: SendMailRequest): Promise<void> {
  const config = getConfig();
  if (!config) return;

  try {
    const response = await fetch(`${config.serverUrl}/push`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({
        device_key: config.deviceKey,
        title: `${SITE_MAIL_OWNER_SUBJECT_PREFIX} · ${dto.email}`,
        subtitle: '来自网站联系表单',
        body: truncate(dto.content, MAX_BODY_LENGTH) || '（无内容）',
        group: '网站留言',
        icon: `${SITE_URL}/icon-192x192.png`,
        url: SITE_URL,
        level: 'timeSensitive',
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
    console.error('[mail] Bark 推送失败', error);
  }
}
