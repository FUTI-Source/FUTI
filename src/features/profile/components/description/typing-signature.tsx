import React, { useEffect, useRef, useState } from 'react';

import { BasicsProps } from '@/components/type.ts';

import { EventEmitter } from '@/hooks/use-event-emitter.ts';
import useMemoizedFn from '@/hooks/use-memoized-fn.ts';
import { cn } from '@/lib/utils';

export enum TypingSignatureEvent {
  START = 'start',
}

type ITypingSignatureProps = BasicsProps<'h2'> & {
  event$?: EventEmitter<TypingSignatureEvent>;
  onAnimationComplete?: () => void;
};

const SIGNATURE = '分享 · 开源 · 实践';
const TYPING_SPEED = 15;
const HOLD_AFTER_TYPING = 200;

export const TypingSignature: React.FC<ITypingSignatureProps> = ({ event$, onAnimationComplete, className, style }) => {
  const timer = useRef<number | undefined>(undefined);
  const started = useRef<boolean>(false);
  const text = useRef<string>('');

  const [inAnimation, setInAnimation] = useState<boolean>(false);
  const [displayedText, setDisplayedText] = useState<string>('');

  const step = useMemoizedFn(() => {
    if (text.current.length < SIGNATURE.length) {
      text.current += SIGNATURE.charAt(text.current.length);
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

  const handleEvent = useMemoizedFn((trigger: TypingSignatureEvent) => {
    if (trigger === TypingSignatureEvent.START) {
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
  }, []);

  // 每次渲染都会注册一次，但 handler 引用稳定且 start() 已幂等，
  // 重复触发只会命中 started 直接返回，不会再叠加一条打字链。
  event$?.useSubscription(handleEvent);

  const content = displayedText.trim();
  const codeClassName = cn(
    '[&>pre]:!font-mono [&>pre]:rounded [&>pre]:!bg-transparent [&>pre]:px-1.5 [&>pre]:transition-colors hover:[&>pre]:!bg-black/20',
    inAnimation && '[&>pre]:!bg-black/20',
    className,
  );

  return (
    <h2 className={codeClassName} style={style}>
      <pre>
        <code className="text-[#abb2bf]">{content}</code>
      </pre>
    </h2>
  );
};
