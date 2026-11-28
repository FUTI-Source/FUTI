"use client";

import { useEffect } from "react";
import { findHashTarget, replayBounce, whenScrollSettled } from "@/lib/bounce";

/**
 * 各类导航点击的回弹重放（每次点击都触发，含二次点击）：
 * - 站点标题（logo）与导航菜单：目标为当前路由时立即重放；跨路由由重挂载自然触发；
 * - 标签页各分组的“回到顶部”（a[href="#top"]）→ 回到顶部后整页内容回弹；
 * - 标签页子标签胶囊（.tag__link，如 #咖啡）→ 目标已在顶部时立即重放，
 *   否则滚动到位后该分组回弹。
 * 不拦截默认行为，滚动仍由浏览器按 CSS scroll-behavior 平滑完成。
 */
export function AnchorBounce() {
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }
      const anchor = (event.target as Element | null)?.closest?.("a");
      if (!anchor) return;
      const href = anchor.getAttribute("href") ?? "";

      // 站点标题（logo）与导航菜单：目标即当前路由时（二次点击）立即重放回弹；
      // 跨路由跳转由路由重挂载自然触发回弹，无需处理。
      // 注意本分支需在 defaultPrevented 守卫之前：Next Link 会对点击
      // 调用 preventDefault，守卫在前会误杀同路由的二次点击。
      if (anchor.classList.contains("logo__link") || anchor.classList.contains("nav__link")) {
        try {
          const target = new URL(href, location.href);
          if (target.pathname === location.pathname && !target.hash) replayBounce();
        } catch {
          // 无效链接忽略
        }
        return;
      }

      if (event.defaultPrevented) return;

      if (href === "#top") {
        if (window.scrollY === 0) {
          replayBounce();
          return;
        }
        whenScrollSettled(() => {
          if (window.scrollY === 0) replayBounce();
        });
        return;
      }

      if (anchor.classList.contains("tag__link") && href.startsWith("#")) {
        const target = findHashTarget(href);
        if (!target) return;
        // 每次点击都回弹：目标已在视口顶部（无滚动发生，如重复点击当前标签）
        // 时立即重放；否则等平滑滚动到位后重放。
        if (Math.abs(target.getBoundingClientRect().top) <= 4) {
          replayBounce();
          return;
        }
        whenScrollSettled(() => {
          if (Math.abs(target.getBoundingClientRect().top) < 80) replayBounce();
        });
      }
    };

    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  return null;
}
