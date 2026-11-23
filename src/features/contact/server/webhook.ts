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

/**
 * 机器人类型识别。
 * 飞书 / 钉钉 / 企微的群机器人 webhook 不接受站点的通用 JSON，必须按各自协议构造消息体；
 * 其余接收端（自建服务、n8n、Make、Zapier 等）走 generic，原样发送通用 JSON。
 */
type WebhookProvider = 'feishu' | 'dingtalk' | 'wecom' | 'generic';

function detectProvider(url: string): WebhookProvider {
  const host = url.toLowerCase();
  if (host.includes('feishu.cn') || host.includes('larksuite.com') || host.includes('larkoffice.com')) {
    return 'feishu';
  }
  if (host.includes('dingtalk.com') || host.includes('dingtalk.cn')) {
    return 'dingtalk';
  }
  if (host.includes('weixin.qq.com') || host.includes('qyapi.weixin.qq.com')) {
    return 'wecom';
  }
  return 'generic';
}

/**
 * 按事件类型把关键字段追加到 lines。
 * contact / donation 走各自结构化字段；其余未知类型退化为列出所有顶层字符串字段，避免信息丢失。
 */
function appendPayloadFields(lines: string[], payload: Record<string, unknown>): void {
  const type = typeof payload.type === 'string' ? payload.type : '';

  if (type === 'contact') {
    if (payload.name) lines.push(`**姓名**：${payload.name}`);
    if (payload.email) lines.push(`**邮箱**：${payload.email}`);
    if (payload.content) lines.push(`**内容**：${String(payload.content)}`);
  } else if (type === 'donation') {
    if (payload.channel) lines.push(`**渠道**：${payload.channel}`);
    if (payload.amount) lines.push(`**金额**：${payload.amount}`);
    if (payload.orderId) lines.push(`**订单号**：${payload.orderId}`);
  } else if (type && !type.endsWith('.webhook_failed')) {
    for (const [key, value] of Object.entries(payload)) {
      if (key === 'type' || key === 'title' || key === 'site' || key === 'timestamp') continue;
      if (typeof value === 'string' && value) lines.push(`**${key}**：${value}`);
    }
  }
}

/** 从通用 payload 渲染出统一的「标题 + 字段列表」，供各机器人格式复用 */
function renderBotMessage(payload: Record<string, unknown>): {
  title: string;
  body: string;
} {
  const title = typeof payload.title === 'string' ? payload.title : '网站通知';
  const lines: string[] = [];

  const site = payload.site as { name?: string; url?: string } | undefined;
  if (site?.name) {
    lines.push(site.url ? `**站点**：[${site.name}](${site.url})` : `**站点**：${site.name}`);
  }

  const type = typeof payload.type === 'string' ? payload.type : '';

  if (type.endsWith('.webhook_failed')) {
    if (payload.error) lines.push(`**错误**：${payload.error}`);
    const original = payload.original as Record<string, unknown> | undefined;
    if (original && typeof original === 'object') {
      if (original.type) lines.push(`**原始类型**：${original.type}`);
      // 失败通知必须带上原始事件（留言 / 打赏）的关键字段，否则站长无法定位是哪条消息失败；
      // 打赏失败对付款人是静默的，机器人消息是唯一记录，更不能丢字段。
      appendPayloadFields(lines, original);
    }
  } else {
    appendPayloadFields(lines, payload);
  }

  if (payload.timestamp) lines.push(`**时间**：${payload.timestamp}`);

  return { title, body: lines.join('\n') };
}

function buildBotPayload(
  provider: WebhookProvider,
  payload: Record<string, unknown>,
): Record<string, unknown> {
  const { title, body } = renderBotMessage(payload);

  if (provider === 'feishu') {
    // 飞书自定义机器人：interactive 卡片
    return {
      msg_type: 'interactive',
      card: {
        config: { wide_screen_mode: true },
        header: {
          title: { tag: 'plain_text', content: title },
          template: 'blue',
        },
        elements: [
          {
            tag: 'div',
            text: { tag: 'lark_md', content: body || '（无内容）' },
          },
        ],
      },
    };
  }

  if (provider === 'dingtalk') {
    // 钉钉自定义机器人：markdown
    return {
      msgtype: 'markdown',
      markdown: {
        title,
        text: `### ${title}\n${body}`,
      },
      at: { isAtAll: false },
    };
  }

  if (provider === 'wecom') {
    // 企业微信群机器人：markdown
    return {
      msgtype: 'markdown',
      markdown: {
        content: `### ${title}\n${body}`,
      },
    };
  }

  return payload;
}

/**
 * 机器人业务错误码判定。
 * 飞书/钉钉/企微在 payload 格式错误、签名校验失败、关键词不匹配等情况下，
 * 仍返回 HTTP 200，但 body 中 code / errcode 非 0。这里把这类"假成功"识别为失败，
 * 避免静默丢消息。generic 接收端不调用本函数，仍按 HTTP 2xx 判定。
 */
function isWebhookBodySuccess(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return true;

  let data: unknown;
  try {
    data = JSON.parse(trimmed);
  } catch {
    // 非 JSON 的 2xx 响应（如纯文本 "success"）视为成功
    return true;
  }

  if (typeof data !== 'object' || data === null) return true;
  const obj = data as Record<string, unknown>;

  if (typeof obj.code === 'number' && obj.code !== 0) return false;
  if (typeof obj.errcode === 'number' && obj.errcode !== 0) return false;
  if (typeof obj.StatusCode === 'number' && obj.StatusCode !== 0) return false;
  if (obj.ok === false) return false;
  if (obj.success === false) return false;

  return true;
}

async function deliver(
  url: string,
  payload: Record<string, unknown>,
  secret?: string,
): Promise<void> {
  const provider = detectProvider(url);
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
      throw new Error(
        `Webhook 返回 ${response.status}${detail ? `：${detail.slice(0, 200)}` : ''}`,
      );
    }

    // 机器人：HTTP 2xx 但业务码失败时，按失败处理（触发失败 webhook / 返回 502）
    if (provider !== 'generic' && !isWebhookBodySuccess(detail)) {
      throw new Error(
        `Webhook 业务处理失败（HTTP ${response.status}）${detail ? `：${detail.slice(0, 200)}` : ''}`,
      );
    }

    console.info('[webhook] 投递成功', { provider, status: response.status });
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
  const results = await Promise.allSettled([
    postWebhook({
      type: 'contact',
      title: '收到一条新的留言',
      site: { name: SITE_NAME, url: SITE_URL },
      name: dto.name,
      email: dto.email,
      content: dto.content,
      timestamp: new Date().toISOString(),
    }),
    sendBark({
      title: `网站留言 · ${dto.name}`,
      subtitle: dto.email,
      body: truncateBarkBody(dto.content) || '（无内容）',
      group: '网站留言',
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
