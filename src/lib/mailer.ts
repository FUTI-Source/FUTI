import nodemailer, { type Transporter } from 'nodemailer';

import type { SendMailRequest, SendMailResponse } from '@/types/mail';

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
    throw new Error('邮件服务尚未配置，请先设置 139 邮箱地址与 SMTP 授权码');
  }
  return {
    host: process.env.MAIL_SMTP_HOST || 'smtp.139.com',
    port: Number(process.env.MAIL_SMTP_PORT || 465),
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

function buildOwnerHtml(dto: SendMailRequest): string {
  const safeEmail = escapeHtml(dto.email);
  const safeContent = escapeHtml(dto.content).replace(/\n/g, '<br />');
  return [
    '<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#333;">',
    '<p style="margin:0 0 12px;">你好，你收到一条来自网站联系表单的新留言。</p>',
    `<p style="margin:0 0 12px;"><strong>发件人邮箱：</strong>${safeEmail}</p>`,
    '<div style="padding:12px 16px;background:#f5f7fa;border-radius:8px;line-height:1.7;">',
    safeContent,
    '</div>',
    '</div>',
  ].join('');
}

function buildConfirmationHtml(dto: SendMailRequest): string {
  const safeEmail = escapeHtml(dto.email);
  const safeContent = escapeHtml(dto.content).replace(/\n/g, '<br />');
  return [
    '<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#333;">',
    `<p style="margin:0 0 12px;">你好 ${safeEmail}，</p>`,
    '<p style="margin:0 0 12px;">你通过网站联系表单提交的留言已成功发送，我们会尽快查阅并回复你。</p>',
    '<div style="padding:12px 16px;background:#f5f7fa;border-radius:8px;line-height:1.7;margin:0 0 12px;">',
    safeContent,
    '</div>',
    '<p style="margin:0;color:#888;font-size:12px;">此邮件由系统自动发送，请勿直接回复。</p>',
    '</div>',
  ].join('');
}

function mapMailError(error: unknown): string {
  const code = (error as { code?: string }).code;
  if (code === 'EAUTH' || code === 'EAUTHENTICATION') {
    return '邮箱认证失败，请检查 139 邮箱地址与 SMTP 授权码';
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
    return '无法连接 139 邮箱服务器，请稍后重试';
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
      subject: `网站留言 · 来自 ${dto.email}`,
      text: `发件人邮箱：${dto.email}\n\n${dto.content}`,
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

  let confirmationSent = false;
  let confirmationMessageId: string | undefined;
  try {
    const confirm = await transporter.sendMail({
      from: config.user,
      to: dto.email,
      subject: '留言提交成功 · 我们已收到你的消息',
      text: [
        `你好 ${dto.email}，`,
        '',
        '你通过网站联系表单提交的留言已成功发送，我们会尽快查阅并回复你。',
        '',
        '你的留言内容：',
        dto.content,
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

  return {
    success: true,
    messageId: ownerMessageId,
    confirmationSent,
    confirmationMessageId,
  };
}
