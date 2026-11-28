"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { findHashTarget } from "@/lib/bounce";

/**
 * 路由切换带 hash 时（如首页标签图 → /tags#标签），
 * 浏览器原生的平滑锚点滚动会被路由提交打断、停在中途位置。
 * 等字体与布局稳定后把锚点目标校正回视口顶部。
 * 同页锚点（标签页胶囊 / #top）由浏览器原生平滑滚动完成、落点正确，不在此列。
 */
export function HashScrollFix() {
  const pathname = usePathname();

  useEffect(() => {
    const hash = window.location.hash;
    if (!hash || hash === "#top") return;

    let cancelled = false;
    let raf = 0;

    // 入场回弹会给容器加 translateY 位移，getBoundingClientRect() 在动画期间
    // 会带上这个偏移；改用 offsetTop 链累加得到不受 transform 影响的布局位置。
    const getLayoutTop = (el: Element): number => {
      let y = 0;
      let node = el instanceof HTMLElement ? el : null;
      while (node) {
        y += node.offsetTop;
        node = node.offsetParent as HTMLElement | null;
      }
      return y;
    };

    const correct = () => {
      if (cancelled) return;
      const el = findHashTarget(hash);
      if (!el) return;
      const top = getLayoutTop(el);
      if (Math.abs(top - window.scrollY) > 2) {
        window.scrollTo({ top, behavior: "instant" });
      }
    };

    const run = async () => {
      try {
        await document.fonts.ready;
      } catch {
        // 字体 API 不可用时直接进入校正
      }
      if (cancelled) return;
      raf = requestAnimationFrame(() => {
        raf = requestAnimationFrame(correct);
      });
    };
    void run();

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
  }, [pathname]);

  return null;
}
