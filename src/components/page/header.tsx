import React, { useEffect, useState } from 'react';
import { FUTIDynamicText } from '@/components/ui/dynamic-text';
import type { BasicsProps } from '@/components/type';
import { cn } from '@/lib/utils.ts';

type IHeaderProps = BasicsProps<'header'>;

const pad = (n: number) => String(n).padStart(2, '0');

/** 与 "2025-01-01 14:08:36" 等长的占位文字，避免首次切换时宽度跳变 */
const PLACEHOLDER = 'YYYY-MM-DD HH:mm:ss';

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

  useEffect(() => {
    const fallback = setTimeout(() => setReady(true), 3000);
    return () => clearTimeout(fallback);
  }, []);

  const year = now.getFullYear();
  const date = `${year}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const clock = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
  const time = `${date} ${clock}`;

  return (
    <header className={cn('relative flex h-20 items-center pt-1 max-sm:justify-center', className)} style={style}>
      <div className="absolute top-0 left-0 h-1 w-full bg-gradient-to-r from-[#37eff9] via-[#0091e4] to-[#64c6f4] shadow-sm" />

      <FUTIDynamicText
        instant={ready}
        text={ready ? time : PLACEHOLDER}
        onAnimationComplete={() => setReady(true)}
        className={cn(
          // 基础排版
          'futi-text-lyrics font-geometos my-0 select-none text-white/55',
          'tabular-nums inline-block whitespace-nowrap',
          // 桌面：16px、左内边距、最小宽度、左对齐
          '!text-base pl-10 min-w-[19ch] text-left',
          // 移动端：去掉间距、放大字号、取消最小宽度、居中
          'max-sm:pl-0 max-sm:!text-xl max-sm:min-w-0 max-sm:text-center',
        )}
      />
    </header>
  );
};
