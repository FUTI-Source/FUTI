import { createHash, randomBytes } from "node:crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface TicketCache {
  ticket: string;
  expiresAt: number;
}

// jsapi_ticket 进程级缓存（有效期 7200s，提前 10 分钟刷新）
let cache: TicketCache | null = null;

async function fetchJson(url: string): Promise<Record<string, unknown>> {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as Record<string, unknown>;
}

/** 获取 jsapi_ticket（带缓存；公众号凭据未配置时返回 null）。 */
async function getJsapiTicket(): Promise<string | null> {
  const appId = process.env.WECHAT_APPID;
  const appSecret = process.env.WECHAT_APPSECRET;
  if (!appId || !appSecret) return null;
  if (cache && cache.expiresAt > Date.now()) return cache.ticket;

  const tokenRes = await fetchJson(
    `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${appId}&secret=${appSecret}`
  );
  const accessToken = tokenRes.access_token;
  if (typeof accessToken !== "string") {
    throw new Error(`获取 access_token 失败: ${String(tokenRes.errmsg ?? "unknown")}`);
  }

  const ticketRes = await fetchJson(
    `https://api.weixin.qq.com/cgi-bin/ticket/getticket?type=jsapi&access_token=${accessToken}`
  );
  const ticket = ticketRes.ticket;
  if (typeof ticket !== "string") {
    throw new Error(`获取 jsapi_ticket 失败: ${String(ticketRes.errmsg ?? "unknown")}`);
  }

  // 提前 10 分钟过期，避免边界失效
  cache = { ticket, expiresAt: Date.now() + 7100_000 };
  return ticket;
}

/**
 * 微信 JS-SDK 签名接口：GET /api/wechat-sign?url=<当前页面URL（不含hash）>
 * 需要环境变量 WECHAT_APPID / WECHAT_APPSECRET（公众号后台配置 JS 安全域名）。
 * 未配置时返回 { enabled: false }，前端静默降级为微信默认抓取。
 */
export async function GET(request: Request) {
  const appId = process.env.WECHAT_APPID;
  const appSecret = process.env.WECHAT_APPSECRET;
  if (!appId || !appSecret) {
    return Response.json({ enabled: false, reason: "未配置 WECHAT_APPID / WECHAT_APPSECRET" });
  }

  const target = new URL(request.url).searchParams.get("url");
  if (!target) {
    return Response.json({ enabled: false, reason: "缺少 url 参数" }, { status: 400 });
  }

  try {
    const ticket = await getJsapiTicket();
    if (!ticket) {
      return Response.json({ enabled: false, reason: "未配置公众号凭据" });
    }
    const nonceStr = randomBytes(8).toString("hex");
    const timestamp = Math.floor(Date.now() / 1000);
    // 微信签名算法：按 key 字典序拼接，SHA1
    const raw = `jsapi_ticket=${ticket}&noncestr=${nonceStr}&timestamp=${timestamp}&url=${target}`;
    const signature = createHash("sha1").update(raw).digest("hex");

    return Response.json({ enabled: true, appId, timestamp, nonceStr, signature });
  } catch (error) {
    return Response.json(
      { enabled: false, reason: error instanceof Error ? error.message : "签名失败" },
      { status: 503 }
    );
  }
}
