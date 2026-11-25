import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex-center min-h-dvh flex-col gap-4 bg-[#15161a] px-6 text-center text-white">
      <h1 className="font-playful text-5xl tracking-wide text-white/90">404</h1>
      <p className="text-sm text-white/60">你访问的页面不存在或已被移动。</p>
      <Link
        href="/"
        className="min-h-11 rounded-md bg-[#0295e5] px-5 py-2 text-sm font-bold text-white shadow-[0_0_18px_rgba(2_149_229_0.45)] hover:bg-[#0295e5]/90 active:bg-[#0179bd]"
      >
        返回首页
      </Link>
    </div>
  );
}
