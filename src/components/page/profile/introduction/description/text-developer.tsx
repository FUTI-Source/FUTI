/* eslint-disable react-refresh/only-export-components,react-compiler/react-compiler */
import React, { useEffect, useRef, useState } from 'react';

import { Highlighter } from '@/components/ui/highlighter';

import { BasicsProps } from '@/components/type.ts';

import { EventEmitter } from '@/hooks/use-event-emitter.ts';
import useMemoizedFn from '@/hooks/use-memoized-fn.ts';
import { cn } from '@/lib/utils';

export enum TextDeveloperEvent {
  START = 'start',
}

type ITextDeveloperProps = BasicsProps<'h2'> & {
  event$?: EventEmitter<TextDeveloperEvent>;
  onAnimationComplete?: () => void;
};

const WORD = String.raw`<Developer />`;
const TYPING_SPEED = 15;
const HOLD_AFTER_TYPING = 200;

export const TextDeveloper: React.FC<ITextDeveloperProps> = ({ event$, onAnimationComplete, className, style }) => {
  const timer = useRef<number>();
  const started = useRef<boolean>(false);
  const text = useRef<string>('');

  const [inAnimation, setInAnimation] = useState<boolean>(false);
  const [displayedText, setDisplayedText] = useState<string>('');

  const step = useMemoizedFn(() => {
    if (text.current.length < WORD.length) {
      text.current += WORD.charAt(text.current.length);
      setDisplayedText(text.current);
      timer.current = window.setTimeout(step, TYPING_SPEED);
      return;
    }
    // 打完后停留一小段，再结束动画（原来这个延时用的是 await，卸载后无法取消）
    timer.current = window.setTimeout(() => {
      setInAnimation(false);
      onAnimationComplete?.();
    }, HOLD_AFTER_TYPING);
  });

  const start = useMemoizedFn(() => {
    if (started.current) return;
    started.current = true;

    clearTimeout(timer.current);
    text.current = '';
    setDisplayedText('');
    setInAnimation(true);
    step();
  });

  const handleEvent = useMemoizedFn((trigger: TextDeveloperEvent) => {
    if (trigger === TextDeveloperEvent.START) {
      start();
    }
  });

  useEffect(() => {
    if (!event$) {
      start();
    }
    return () => {
      clearTimeout(timer.current);
      started.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 每次渲染都会注册一次，但 handler 引用稳定且 start() 已幂等，
  // 重复触发只会命中 started 直接返回，不会再叠加一条打字链。
  event$?.useSubscription(handleEvent);

  return (
    <Highlighter
      className={cn(
        'font-monospaceNeon [&>pre]:rounded [&>pre]:!bg-transparent [&>pre]:px-1.5 [&>pre]:transition-colors hover:[&>pre]:!bg-black/20',
        inAnimation && '[&>pre]:!bg-black/20',
        className,
      )}
      style={style}
      content={displayedText}
      language="html"
      as="h2"
    />
  );
};
