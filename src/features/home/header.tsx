import React, { useEffect, useState } from 'react';
import * as m from 'motion/react-m';

import { DynamicText } from '@/components/ui/dynamic-text';
import type { BasicsProps } from '@/components/types';
import { cn } from '@/lib/utils';

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
    <header 
      className={cn(
        'header-drag relative flex h-20 shrink-0 items-center pt-1 max-sm:justify-center',
        className
      )} 
      style={style}
    >
      <div className="absolute top-0 left-0 h-px w-full bg-gradient-to-r from-[#37eff9]/60 via-[#0091e4]/60 to-[#64c6f4]/60" />

      <DynamicText
        as={m.p}
        instant={ready}
        text={ready ? time : PLACEHOLDER}
        onAnimationComplete={() => setReady(true)}
        className={cn(
          // 基础排版
          'header-no-drag header-time text-shadow-soft font-playful my-0 select-none text-[color:var(--text-time-color)]',
          'tabular-nums inline-block whitespace-nowrap',
          // 桌面：与页脚共用左外边距、最小宽度、左对齐
          'pl-[var(--desktop-edge-inset)] min-w-[19ch] text-left',
          // 移动端：去掉间距、取消最小宽度、居中（字号由样式表统一控制）
          'max-sm:pl-0 max-sm:min-w-0 max-sm:text-center',
        )}
      />
    </header>
  );
};
