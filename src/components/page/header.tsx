import React, { useEffect, useState } from 'react';
import { FUTIDynamicText } from '@/components/ui/dynamic-text';
import type { BasicsProps } from '@/components/type';
import { cn } from '@/lib/utils.ts';

type IHeaderProps = BasicsProps<'header'>;

const pad = (n: number) => String(n).padStart(2, '0');

// 首次入场打字用的占位文字，必须是【常量】，不能是时间
const PLACEHOLDER = 'LOCAL TIME';

export const Header: React.FC<IHeaderProps> = ({ className, style }) => {
  const [now, setNow] = useState(() => new Date());
  // 首次打字动画是否播完，播完前用动画模式，播完后切 instant 模式
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

  const time = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

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
