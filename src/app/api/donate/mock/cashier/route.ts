import { DONATE_CHANNEL_LABELS, getMockOrder, isMockEnabled } from '@/features/donate/server/mock';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (char) =>
      (
        {
          '&': '&amp;',
          '<': '&lt;',
          '>': '&gt;',
          '"': '&quot;',
          "'": '&#39;',
        } as Record<string, string>
      )[char] ?? char,
  );
}

function notFound(): Response {
  return new Response('Not Found', {
    status: 404,
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}

export function GET(request: Request) {
  if (!isMockEnabled()) return notFound();

  const orderId = new URL(request.url).searchParams.get('orderId')?.trim();
  if (!orderId) return notFound();

  const order = getMockOrder(orderId);
  if (!order) return notFound();

  const safeOrderId = escapeHtml(order.orderId);
  const payBase = `/api/donate/mock/pay?orderId=${encodeURIComponent(order.orderId)}`;

  const html = `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>模拟收银台</title>
<style>
  :root { color-scheme: dark; }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    min-height: 100vh;
    display: grid;
    place-items: center;
    padding: 24px;
    background: #07090c;
    color: #f5f7fa;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC",
      "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
  }
  main {
    width: 100%;
    max-width: 360px;
    padding: 28px 24px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 18px;
    background: #14171c;
    box-shadow: 0 30px 80px -24px rgba(0, 0, 0, 0.85);
  }
  .badge {
    display: inline-block;
    margin: 0 0 14px;
    padding: 4px 10px;
    border-radius: 999px;
    background: rgba(255, 209, 102, 0.12);
    color: #ffd166;
    font-size: 12px;
  }
  h1 { margin: 0 0 8px; font-size: 18px; font-weight: 600; }
  .amount { margin: 0 0 6px; font-size: 34px; font-weight: 700; letter-spacing: 0.5px; }
  .order { margin: 0 0 22px; color: rgba(255, 255, 255, 0.4); font-size: 12px; word-break: break-all; }
  a {
    display: block;
    padding: 12px 16px;
    border-radius: 12px;
    text-align: center;
    text-decoration: none;
    font-size: 15px;
    font-weight: 600;
  }
  .primary { margin-bottom: 10px; background: #0295e5; color: #fff; }
  .ghost { border: 1px solid rgba(255, 255, 255, 0.14); color: rgba(255, 255, 255, 0.75); }
  .tip { margin: 18px 0 0; color: rgba(255, 255, 255, 0.35); font-size: 12px; line-height: 1.6; }
</style>
</head>
<body>
<main>
  <p class="badge">本地模拟支付</p>
  <h1>${DONATE_CHANNEL_LABELS[order.channel]}</h1>
  <p class="amount">¥${order.amount.toFixed(2)}</p>
  <p class="order">订单号 ${safeOrderId}</p>
  <a class="primary" href="${payBase}&amp;result=success">模拟支付成功</a>
  <a class="ghost" href="${payBase}&amp;result=cancel">取消支付</a>
  <p class="tip">该页面仅用于开发联调，不会产生真实扣款。设置 XINGYIFU_MOCK=true 时启用。</p>
</main>
</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}
