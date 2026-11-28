"use client";

import { ArrowUp } from "lucide-react";

export function BackToTop() {
  return (
    <button
      className="top"
      title="返回顶部"
      aria-label="返回顶部"
      onClick={() => window.scrollTo({ top: 0, left: 0, behavior: "smooth" })}
    >
      <ArrowUp aria-hidden="true" />
    </button>
  );
}
