import { Resend } from 'resend';

export const config = {
  runtime: 'edge',
};

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req: Request) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
  // 处理跨域预检
  if (req.method === 'OPTIONS') return new Response(null, { headers });

  if (req.method !== 'POST') {
    return Response.json({ error: '仅支持POST请求' }, { status: 405, headers });
  }

  try {
    const { senderEmail, message } = await req.json() as {
      senderEmail: string;
      message: string;
    };
    // 邮箱格式校验
    if (!senderEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(senderEmail)) {
      return Response.json({ error: '请填写有效的邮箱地址' }, { status: 400, headers });
    }
    if (!message.trim()) {
      return Response.json({ error: '留言内容不能为空' }, { status: 400, headers });
    }

    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL!, // Resend验证过的发件邮箱
      to: 'mine@139.com', // 你的接收邮箱，固定不变
      subject: `网站新留言 - 来自 ${senderEmail}`,
      replyTo: senderEmail, // 你收到邮件直接回复，自动回对方邮箱
      html: `
        <div style="font-family: system-ui, sans-serif; padding:16px;">
          <h3>你的网站收到一条留言</h3>
          <p>访客邮箱：${senderEmail}</p>
          <hr style="margin:16px 0;">
          <p style="white-space: pre-wrap;">${message}</p>
        </div>
      `,
    });

    return Response.json({ success: true, msg: '留言发送成功' }, { headers });
  } catch (err) {
    console.error('contact api error：', err);
    return Response.json({ error: '发送失败，请稍后重试' }, { status: 500, headers });
  }
}
