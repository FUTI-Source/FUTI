"use client";

import { useRef } from "react";
import { useServerInsertedHTML } from "next/navigation";
import { site } from "@/lib/site.config";

/**
 * QQ / 微信默认抓取适配：itemprop 微数据。
 * React 19 不会把含 itemProp 的 <meta> 提升进 <head>，
 * 因此用 useServerInsertedHTML 直接注入（与 ThemeScript 同机制，ref 防重复）。
 */
export function QQMetas() {
  const injected = useRef(false);

  useServerInsertedHTML(() => {
    if (injected.current || !site.url) return null;
    injected.current = true;
    return (
      <>
        <meta itemProp="name" content={site.title} />
        <meta itemProp="description" content={site.description} />
        <meta itemProp="image" content={`${site.url}/opengraph-image`} />
      </>
    );
  });

  return null;
}
