"use client";

import { useEffect } from "react";
import { findHashTarget, replayBounce, whenScrollSettled } from "@/lib/bounce";

/**
 * 同页锚点跳转到位后重放入场回弹：
 * - 标签页各分组的“回到顶部”（a[href="#top"]）→ 回到顶部后整页内容回弹；
 * - 标签页子标签胶囊（.tag__link，如 #咖啡）→ 滚动到目标分组后该分组回弹。
 * 不拦截默认行为，滚动仍由浏览器按 CSS scroll-behavior 平滑完成。
 */
export function AnchorBounce() {
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
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
