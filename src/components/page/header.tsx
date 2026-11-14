import React, { useEffect, useState } from 'react';
import { FUTIDynamicText } from '@/components/ui/dynamic-text';
import type { BasicsProps } from '@/components/type';
import { cn } from '@/lib/utils.ts';

type IHeaderProps = BasicsProps<'header'>;

const pad = (n: number) => String(n).padStart(2, '0');

// 首次入场打字用的占位文字
const PLACEHOLDER = 'LOCAL TIME';

export const Header: React.FC<IHeaderProps> = ({ className, style }) => {
  const [now, setNow] = useState(() => new Date());
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const update = () => setNow(new Date());
    const id = setInterval(update, 1000);
    document.addEventListener('visibilitychange', update);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', update);
    };
  }, []);

  // 兜底：万一首次动画没触发
  useEffect(() => {
    const fallback = setTimeout(() => setReady(true), 3000);
    return () => clearTimeout(fallback);
  }, []);

  const year = now.getFullYear();
  const date = `${year}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const clock = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

  const time = `${date} ${clock}`; // 2025-01-01 14:08:36

  return (
    <header className={cn('relative flex h-20 items-center pt-1 max-sm:justify-center', className)} style={style}>
      <div className="absolute top-0 left-0 h-1 w-full bg-gradient-to-r from-[#37eff9] via-[#0091e4] to-[#64c6f4] shadow-sm" />
      <FUTIDynamicText
        instant={ready}
        text={ready ? time : PLACEHOLDER}
        onAnimationComplete={() => setReady(true)}
        className="futi-text-lyrics font-geometos my-0 pl-10 !text-base text-white/55 select-none max-sm:pl-0 tabular-nums"
      />
    </header>
  );
};
