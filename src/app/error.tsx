'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('页面渲染异常:', error);
  }, [error]);

  return (
    <div className="flex-center min-h-dvh flex-col gap-4 bg-[#15161a] px-6 text-center text-white">
      <h1 className="font-geometos text-3xl tracking-wide">页面出了点问题</h1>
      <p className="text-sm text-white/60">请稍后重试，或刷新页面。</p>
      <button
        type="button"
        onClick={reset}
        className="rounded-md bg-[#0295e5] px-5 py-2 text-sm font-bold text-white shadow-[0_0_18px_rgba(2_149_229_0.45)] hover:bg-[#0295e5]/90"
      >
        重新加载
      </button>
    </div>
  );
}
