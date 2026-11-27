"use client";

import { ArrowUp } from "lucide-react";

export function BackToTop() {
  return (
    <button
      className="top"
      title="Top"
      aria-label="Back to top"
      onClick={() => window.scrollTo({ top: 0, left: 0, behavior: "smooth" })}
    >
      <ArrowUp aria-hidden="true" />
    </button>
  );
}
