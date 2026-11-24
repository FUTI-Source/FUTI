import { isHttpUrl } from '@/lib/http/url';

/**
 * 通知接收端适配器。
 *
 * 飞书 / 钉钉 / 企微的群机器人 webhook 不接受站点的通用 JSON，必须按各自协议构造消息体；
 * 其余接收端（自建服务、n8n、Make、Zapier 等）走 generic，原样发送通用 JSON。
 */

export type WebhookProvider = 'feishu' | 'dingtalk' | 'wecom' | 'generic';

export function detectProvider(url: string): WebhookProvider {
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
 * 访客可控文本在机器人里的渲染前处理。
 *
 * 留言的姓名/邮箱/内容会被拼进 lark_md / markdown 消息体，原样拼接等于让访客
 * 在站长的通知里构造超链接（钓鱼文案）或伪造字段行。这里把方括号换成
 * 全角等价字符、去掉反引号与除换行外的控制字符，使任何标记都无法成型。
 */
export function toBotSafeText(value: string, max = 1000): string {
  const flat = value
    .replace(/\r\n?/g, '\n')
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, '')
    .replace(/\[[^\]]*\]\(\s*(?:javascript|data|vbscript):[^)]*\)/gi, '（已移除可疑链接）')
    .replace(/\[/g, '［')
    .replace(/\]/g, '］')
    .replace(/`/g, '')
    .trim();

  if (flat.length <= max) return flat;
  return `${flat.slice(0, max)}…`;
}

export interface NotificationEvent {
  type: string;
  title: string;
  site: { name: string; url: string };
  timestamp: string;
  [key: string]: unknown;
}

/**
 * 按事件类型把关键字段追加到 lines。
 * contact / donation 走各自结构化字段；其余未知类型退化为列出所有顶层字符串字段，
 * 避免信息丢失。站长侧字段（错误原因等）不做访客文本处理，直接展示。
 */
function appendPayloadFields(lines: string[], payload: NotificationEvent): void {
  const { type } = payload;

  if (type === 'contact') {
    if (payload.name) lines.push(`**姓名**：${toBotSafeText(String(payload.name))}`);
    if (payload.email) lines.push(`**邮箱**：${toBotSafeText(String(payload.email))}`);
    if (payload.content) lines.push(`**内容**：${toBotSafeText(String(payload.content), 2000)}`);
  } else if (type === 'donation') {
    if (payload.channel) lines.push(`**渠道**：${toBotSafeText(String(payload.channel))}`);
    if (payload.amount) lines.push(`**金额**：${toBotSafeText(String(payload.amount))}`);
    if (payload.orderId) lines.push(`**订单号**：${toBotSafeText(String(payload.orderId))}`);
  } else if (type && !type.endsWith('.webhook_failed')) {
    for (const [key, value] of Object.entries(payload)) {
      if (key === 'type' || key === 'title' || key === 'site' || key === 'timestamp') continue;
      if (typeof value === 'string' && value) lines.push(`**${key}**：${toBotSafeText(value)}`);
    }
  }
}

/** 从通用 payload 渲染出统一的「标题 + 字段列表」，供各机器人格式复用 */
export function renderBotMessage(payload: NotificationEvent): { title: string; body: string } {
  const lines: string[] = [];

  // 站点名与地址来自本地配置（非访客可控），保留可点击链接；访客字段一律走 toBotSafeText
  if (payload.site?.name) {
    lines.push(
      isHttpUrl(payload.site.url)
        ? `**站点**：[${toBotSafeText(payload.site.name)}](${payload.site.url})`
        : `**站点**：${toBotSafeText(payload.site.name)}`,
    );
  }

  if (payload.type.endsWith('.webhook_failed')) {
    if (payload.error) lines.push(`**错误**：${toBotSafeText(String(payload.error), 500)}`);
    const original = payload.original as NotificationEvent | undefined;
    if (original && typeof original === 'object') {
      if (original.type) lines.push(`**原始类型**：${toBotSafeText(original.type)}`);
      // 失败通知必须带上原始事件（留言 / 打赏）的关键字段，否则站长无法定位是哪条消息失败；
      // 打赏失败对付款人是静默的，机器人消息是唯一记录，更不能丢字段。
      appendPayloadFields(lines, original);
    }
  } else {
    appendPayloadFields(lines, payload);
  }

  if (payload.timestamp) lines.push(`**时间**：${toBotSafeText(payload.timestamp)}`);

  return { title: toBotSafeText(payload.title) || '网站通知', body: lines.join('\n') };
}

export function buildBotPayload(
  provider: WebhookProvider,
  payload: NotificationEvent,
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
 * 仍返回 HTTP 200，但 body 中 code / errcode 非 0。这里把这类“假成功”识别为失败，
 * 避免静默丢消息。generic 接收端不调用本函数，仍按 HTTP 2xx 判定。
 */
export function isWebhookBodySuccess(text: string): boolean {
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
