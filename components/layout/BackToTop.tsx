"use client";

import { ArrowUp } from "lucide-react";
import { replayBounce, whenScrollSettled } from "@/lib/bounce";

/** 平滑滚回顶部，到位后内容重放入场回弹。 */
export function BackToTop() {
  return (
    <button
      className="top"
      title="返回顶部"
      aria-label="返回顶部"
      onClick={() => {
        if (window.scrollY === 0) {
          replayBounce();
          return;
        }
        window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
        whenScrollSettled(() => {
          if (window.scrollY === 0) replayBounce();
        });
      }}
    >
      <ArrowUp aria-hidden="true" />
    </button>
  );
}
