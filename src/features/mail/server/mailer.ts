import nodemailer, { type Transporter } from 'nodemailer';

import {
  SITE_AUTHOR_NAME,
  SITE_DOMAIN,
  SITE_LANG,
  SITE_MAIL_CONFIRM_SUBJECT,
  SITE_MAIL_HOME_CTA,
  SITE_MAIL_OWNER_SUBJECT_PREFIX,
  SITE_MAIL_PROVIDER,
  SITE_MAIL_SMTP_HOST,
  SITE_MAIL_SMTP_PORT,
  SITE_NAME,
  SITE_URL,
} from '@/lib/site';

import type { SendMailRequest, SendMailResponse } from '../types';
import { pushBarkMessage } from './bark';

interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  to: string;
  name: string;
}

let cachedTransporter: Transporter | null = null;

function getConfig(): SmtpConfig {
  const user = process.env.MAIL_USER;
  const pass = process.env.MAIL_PASS;
  if (!user || !pass) {
    throw new Error(`邮件服务尚未配置，请先设置${SITE_MAIL_PROVIDER}地址与 SMTP 授权码`);
  }
  return {
    host: process.env.MAIL_SMTP_HOST || SITE_MAIL_SMTP_HOST,
    port: Number(process.env.MAIL_SMTP_PORT || SITE_MAIL_SMTP_PORT),
    secure: process.env.MAIL_SMTP_SECURE !== 'false',
    user,
    pass,
    to: process.env.MAIL_TO || user,
    name: user.split('@')[1] || '139.com',
  };
}

function getTransporter(config: SmtpConfig): Transporter {
  if (cachedTransporter) return cachedTransporter;
  cachedTransporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    pool: true,
    maxConnections: 2,
    maxMessages: 100,
    name: config.name,
    auth: { user: config.user, pass: config.pass },
    tls: { servername: config.host },
    connectionTimeout: 8000,
    greetingTimeout: 8000,
    socketTimeout: 10000,
  });
  return cachedTransporter;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const MAIL_LOGO = `${SITE_URL}/icon-192x192.png`;
const ACCENT = '#3A8CE0';
const ACCENT_TEXT = '#1D6FC7';
const ACCENT_TINT = '#E9F2FD';
const TITLE_COLOR = '#15181E';
const MUTED_COLOR = '#6B7280';
const FAINT_COLOR = '#9AA3AF';

/** 收件箱预览文本：压平换行并截断，避免整段正文被塞进摘要 */
function toPreheader(value: string, max = 90): string {
  const flat = value.replace(/\s+/g, ' ').trim();
  return escapeHtml(flat.length > max ? `${flat.slice(0, max)}…` : flat);
}

interface MailShellOptions {
  preheader: string;
  title: string;
  subtitle: string;
  cardLabel: string;
  cardHighlight?: string;
  cardBody: string;
  ctaText: string;
  ctaHref: string;
  footerNote: string;
}

/**
 * 统一的邮件外壳：600px 单列卡片 + 顶部品牌色条 + 圆角图标 + 留言卡 + 胶囊按钮。
 * 全程表格布局与内联样式，避免 Gmail / Outlook / QQ 邮箱剥离 <style> 后变形。
 */
function buildMailShell({
  preheader,
  title,
  subtitle,
  cardLabel,
  cardHighlight,
  cardBody,
  ctaText,
  ctaHref,
  footerNote,
}: MailShellOptions): string {
  return `<!DOCTYPE html>
<html lang="${SITE_LANG}">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="color-scheme" content="light only" />
<meta name="supported-color-schemes" content="light only" />
<title>${title}</title>
</head>
<body style="margin:0;padding:0;background-color:#F2F5F9;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;color:transparent;">${preheader}</div>
<div style="margin:0;padding:28px 12px;background-color:#F2F5F9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','PingFang SC','Hiragino Sans GB','Microsoft YaHei',Arial,sans-serif;">
  <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;margin:0 auto;background-color:#FFFFFF;border:1px solid #E8EDF4;border-radius:16px;">
    <tr>
      <td style="height:6px;background-color:${ACCENT};border-radius:16px 16px 0 0;font-size:0;line-height:0;">&nbsp;</td>
    </tr>
    <tr>
      <td align="center" style="padding:32px 24px 0;">
        <img src="${MAIL_LOGO}" width="72" height="72" alt="${SITE_NAME}" style="display:block;width:72px;height:72px;border:0;border-radius:18px;" />
      </td>
    </tr>
    <tr>
      <td align="center" style="padding:20px 28px 0;">
        <h1 style="margin:0;font-size:22px;line-height:1.45;font-weight:700;color:${TITLE_COLOR};">${title}</h1>
        <p style="margin:10px 0 0;font-size:14px;line-height:1.6;color:${MUTED_COLOR};">${subtitle}</p>
      </td>
    </tr>
    <tr>
      <td style="padding:24px 28px 0;">
        <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="width:100%;background-color:#F7F9FC;border-radius:12px;">
          <tr>
            <td style="padding:20px;">
              <div style="font-size:12px;font-weight:600;letter-spacing:0.08em;color:${FAINT_COLOR};">${cardLabel}</div>
              ${cardHighlight ? `<div style="margin-top:6px;font-size:15px;font-weight:600;color:${ACCENT_TEXT};word-break:break-all;">${cardHighlight}</div>` : ''}
              <div style="margin:16px 0;border-top:1px dashed #DBE4F0;font-size:0;line-height:0;">&nbsp;</div>
              <div style="font-size:15px;line-height:1.8;color:#2B3038;word-break:break-word;">${cardBody}</div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td align="center" style="padding:26px 28px 0;">
        <a href="${ctaHref}" style="display:inline-block;padding:12px 30px;font-size:14px;font-weight:600;line-height:1;color:${ACCENT_TEXT};text-decoration:none;background-color:${ACCENT_TINT};border-radius:999px;">${ctaText}</a>
      </td>
    </tr>
    <tr>
      <td align="center" style="padding:26px 28px 30px;">
        <div style="border-top:1px dashed #E3E9F2;font-size:0;line-height:0;">&nbsp;</div>
        <p style="margin:16px 0 0;font-size:12px;line-height:1.7;color:${FAINT_COLOR};">${footerNote}</p>
        <p style="margin:6px 0 0;font-size:12px;line-height:1.7;"><a href="${SITE_URL}" style="color:${ACCENT_TEXT};text-decoration:none;">${SITE_DOMAIN}</a></p>
      </td>
    </tr>
  </table>
</div>
</body>
</html>`;
}

function buildOwnerHtml(dto: SendMailRequest): string {
  const safeEmail = escapeHtml(dto.email);
  const safeContent = escapeHtml(dto.content).replace(/\n/g, '<br />');
  return buildMailShell({
    preheader: toPreheader(dto.content),
    title: '收到一条新的留言',
    subtitle: '来自网站联系表单',
    cardLabel: '发件人',
    cardHighlight: safeEmail,
    cardBody: safeContent,
    ctaText: '回复留言者',
    ctaHref: `mailto:${safeEmail}?subject=${encodeURIComponent('回复：网站留言')}`,
    footerNote: `此邮件由${SITE_AUTHOR_NAME}个人主页自动发出，直接回复将发送给留言者。`,
  });
}

function buildConfirmationHtml(dto: SendMailRequest): string {
  const safeContent = escapeHtml(dto.content).replace(/\n/g, '<br />');
  return buildMailShell({
    preheader: `你的留言已成功送达${SITE_AUTHOR_NAME}，我会尽快查阅并回复。`,
    title: '留言已送达',
    subtitle: `感谢你的来信，${escapeHtml(dto.email)}，我会尽快回复。`,
    cardLabel: '你的留言',
    cardBody: safeContent,
    ctaText: SITE_MAIL_HOME_CTA,
    ctaHref: SITE_URL,
    footerNote: '此邮件由系统自动发送，请勿直接回复。',
  });
}

function mapMailError(error: unknown): string {
  const code = (error as { code?: string }).code;
  if (code === 'EAUTH' || code === 'EAUTHENTICATION') {
    return `邮箱认证失败，请检查${SITE_MAIL_PROVIDER}地址与 SMTP 授权码`;
  }
  if (
    code === 'ECONNECTION' ||
    code === 'ETIMEDOUT' ||
    code === 'ESOCKET' ||
    code === 'ENOTFOUND' ||
    code === 'ECONNREFUSED' ||
    code === 'ENETUNREACH' ||
    code === 'EHOSTUNREACH' ||
    code === 'EAI_AGAIN'
  ) {
    return `无法连接${SITE_MAIL_PROVIDER}服务器，请稍后重试`;
  }
  return '邮件发送失败，请稍后重试';
}

export async function sendContactMail(
  dto: SendMailRequest,
): Promise<SendMailResponse> {
  const config = getConfig();
  const transporter = getTransporter(config);

  let ownerMessageId: string;
  try {
    const info = await transporter.sendMail({
      from: config.user,
      to: config.to,
      replyTo: dto.email,
      subject: `${SITE_MAIL_OWNER_SUBJECT_PREFIX} · 来自 ${dto.email}`,
      text: [
        '你收到一条来自网站联系表单的新留言。',
        '',
        `发件人邮箱：${dto.email}`,
        '',
        dto.content,
        '',
        '——',
        SITE_NAME,
        SITE_URL,
      ].join('\n'),
      html: buildOwnerHtml(dto),
    });
    ownerMessageId = info.messageId;
  } catch (error) {
    const err = error as Error & { code?: string };
    console.error(
      `站长留言邮件发送失败: ${err.code ?? ''} ${err.message}`,
      err.stack,
    );
    throw new Error(mapMailError(error));
  }

  // 与确认邮件并行推送 Bark，Bark 失败不会影响表单结果
  const barkPush = pushBarkMessage(dto);

  let confirmationSent = false;
  let confirmationMessageId: string | undefined;
  try {
    const confirm = await transporter.sendMail({
      from: config.user,
      to: dto.email,
      subject: SITE_MAIL_CONFIRM_SUBJECT,
      text: [
        '你好，',
        '',
        '你通过网站联系表单提交的留言已成功发送，我会尽快查阅并回复。',
        '',
        '你的留言内容：',
        dto.content,
        '',
        '——',
        SITE_NAME,
        SITE_URL,
      ].join('\n'),
      html: buildConfirmationHtml(dto),
    });
    confirmationSent = true;
    confirmationMessageId = confirm.messageId;
  } catch (error) {
    const err = error as Error & { code?: string };
    console.error(
      `顾客确认邮件发送失败: ${err.code ?? ''} ${err.message}`,
      err.stack,
    );
  }

  await barkPush;

  return {
    success: true,
    messageId: ownerMessageId,
    confirmationSent,
    confirmationMessageId,
  };
}
