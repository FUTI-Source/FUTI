"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * 微信 JS-SDK 分享适配（可选启用）：
 * - 服务端 /api/wechat-sign 签名成功时，精确控制微信内分享的标题/描述/缩略图；
 * - 未配置公众号凭据时静默降级（微信默认抓取页面标题与首图），不加载 SDK。
 * 需要：公众号（订阅号即可）后台把站点域名配置为 JS 安全域名，
 *       并设置环境变量 WECHAT_APPID / WECHAT_APPSECRET。
 */
const JS_SDK = "https://res.wx.qq.com/open/js/jweixin-1.6.0.js";

type WxLike = {
  config: (options: Record<string, unknown>) => void;
  ready: (cb: () => void) => void;
  error: (cb: (res: unknown) => void) => void;
  updateAppMessageShareData: (data: { title: string; desc: string; link: string; imgUrl: string }) => void;
  updateTimelineShareData: (data: { title: string; link: string; imgUrl: string }) => void;
};

function loadSdk(): Promise<WxLike | null> {
  const w = window as unknown as { wx?: WxLike };
  if (w.wx) return Promise.resolve(w.wx);
  return new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = JS_SDK;
    script.onload = () => resolve(w.wx ?? null);
    script.onerror = () => resolve(null);
    document.head.appendChild(script);
  });
}

export function WeChatShare() {
  const pathname = usePathname();

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const url = window.location.href.split("#")[0];
        const res = await fetch(`/api/wechat-sign?url=${encodeURIComponent(url)}`, { cache: "no-store" });
        if (!res.ok) return;
        const cfg = (await res.json()) as {
          enabled: boolean;
          appId?: string;
          timestamp?: number;
          nonceStr?: string;
          signature?: string;
        };
        if (cancelled || !cfg.enabled || !cfg.appId || !cfg.signature) return;

        const wx = await loadSdk();
        if (cancelled || !wx) return;

        wx.config({
          debug: false,
          appId: cfg.appId,
          timestamp: cfg.timestamp,
          nonceStr: cfg.nonceStr,
          signature: cfg.signature,
          jsApiList: ["updateAppMessageShareData", "updateTimelineShareData"],
        });

        wx.ready(() => {
          if (cancelled) return;
          const title = document.title;
          const desc =
            document.querySelector('meta[name="description"]')?.getAttribute("content") ?? "";
          const imgUrl =
            document.querySelector('meta[property="og:image"]')?.getAttribute("content") ?? "";
          const link = window.location.href.split("#")[0];
          wx.updateAppMessageShareData({ title, desc, link, imgUrl });
          wx.updateTimelineShareData({ title, link, imgUrl });
        });
        wx.error(() => {
          // 签名或权限问题时静默降级为默认抓取
        });
      } catch {
        // 网络等原因静默降级
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [pathname]);

  return null;
}
