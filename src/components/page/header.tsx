import React, { useEffect, useState } from 'react';
import { FUTIDynamicText } from '@/components/ui/dynamic-text';
import type { BasicsProps } from '@/components/type';
import { cn } from '@/lib/utils.ts';

type IHeaderProps = BasicsProps<'header'>;

const pad = (n: number) => String(n).padStart(2, '0');

export const Header: React.FC<IHeaderProps> = ({ className, style }) => {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const time = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

  return (
    <header className={cn('relative flex h-20 items-center pt-1 max-sm:justify-center', className)} style={style}>
      <div className="absolute top-0 left-0 h-1 w-full bg-gradient-to-r from-[#37eff9] via-[#0091e4] to-[#64c6f4] shadow-sm" />
      <FUTIDynamicText
        text={time}
        className="futi-text-lyrics font-geometos my-0 pl-10 !text-base text-white/55 select-none max-sm:pl-0"
      />
    </header>
  );
};
