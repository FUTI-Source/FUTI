import React, { useEffect, useState } from 'react';
import { FUTIDynamicText } from '@/components/ui/dynamic-text';
import type { BasicsProps } from '@/components/type';
import { cn } from '@/lib/utils.ts';

type IHeaderProps = BasicsProps<'header'>;

/** 补零：5 → "05"，12 → "12" */
const pad = (n: number) => String(n).padStart(2, '0');

/**
 * 首次入场打字机用的占位文字。
 * 刻意写成 19 个字符，与 "2025-01-01 14:08:36" 等长，
 * 这样打字结束切到真实时间时，宽度不会跳变。
 */
const PLACEHOLDER = 'YYYY-MM-DD HH:mm:ss';

export const Header: React.FC<IHeaderProps> = ({ className, style }) => {
  const [now, setNow] = useState(() => new Date());

  /** 首次打字动画是否播完：false = 动画模式，true = instant 模式 */
  const [ready, setReady] = useState(false);

  // 每秒刷新；切回前台时立刻校正一次，避免显示切走前的旧时间
  useEffect(() => {
    const update = () => setNow(new Date());
    const id = setInterval(update, 1000);
    document.addEventListener('visibilitychange', update);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', update);
    };
  }, []);

  // 兜底：极端情况下首次动画没被触发，3 秒后强制切到 instant 模式
  useEffect(() => {
    const fallback = setTimeout(() => setReady(true), 3000);
    return () => clearTimeout(fallback);
  }, []);

  /**
   * 年月日时分秒全部从同一个 now 派生，不额外建 state。
   * getFullYear() 每秒会执行一次，但只是读一个数字字段（几十纳秒），
   * 相比一次 React 渲染可忽略；不缓存反而保证了跨年时自动跳到下一年。
   */
  const year = now.getFullYear();
  const date = `${year}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const clock = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
  const time = `${date} ${clock}`; // 2025-01-01 14:08:36 → 19 个字符

  return (
    <header className={cn('relative flex h-20 items-center pt-1 max-sm:justify-center', className)} style={style}>
      <div className="absolute top-0 left-0 h-1 w-full bg-gradient-to-r from-[#37eff9] via-[#0091e4] to-[#64c6f4] shadow-sm" />

      <FUTIDynamicText
        instant={ready}
        text={ready ? time : PLACEHOLDER}
        onAnimationComplete={() => setReady(true)}
        className={cn(
          // —— 原有样式，一个字没动 ——
          'futi-text-lyrics font-geometos my-0 pl-10 !text-base text-white/55 select-none max-sm:pl-0',
          // 等宽数字：秒数跳动时每个数字占同样宽度，不会左右抖
          'tabular-nums',
          // 最小宽度兜底：非等宽字体下，两个状态宽度不一致时也不会挤动右侧元素
          'min-w-[19ch]',
          // 固定起点左对齐，多出来的空白统一藏在右边
          'inline-block text-left',
        )}
      />
    </header>
  );
};
