import React, { useEffect, useRef, useState } from 'react';

import * as m from 'motion/react-m';

import { FUTIDynamicText } from '@/components/ui/dynamic-text';
import { BasicsProps } from '@/components/type.ts';

import useEventEmitter, { EventEmitter } from '@/hooks/use-event-emitter.ts';
import useMemoizedFn from '@/hooks/use-memoized-fn.ts';
import { cn } from '@/lib/utils';

enum TypingSignatureEvent {
  START = 'start',
}

type ITypingSignatureProps = BasicsProps<'h2'> & {
  event$?: EventEmitter<TypingSignatureEvent>;
  onAnimationComplete?: () => void;
};

const SIGNATURE = '分享 · 开源 · 实践';
const TYPING_SPEED = 15;
const HOLD_AFTER_TYPING = 200;

const TypingSignature: React.FC<ITypingSignatureProps> = ({ event$, onAnimationComplete, className, style }) => {
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

type IDescriptionProps = BasicsProps;

export const Description: React.FC<IDescriptionProps> = ({ className, style }) => {
  const [inAnimation, setInAnimation] = useState<boolean>(true);

  const typingEvent$ = useEventEmitter<TypingSignatureEvent>();

  return (
    <div
      className={cn(
        // 父级（App 里的 flex-col items-center）已负责水平居中，这里不再写 mx-auto：
        // wrapper 是收缩宽度，mx-auto 拿不到剩余空间，属于空转。
        // min-w 固定成"打字完成后"的真实内容宽度，配合 justify-center，
        // 让内容在盒子内部也居中，避免打字过程中文字贴左、视觉偏左。
        'profile-description flex h-7 w-fit min-w-[245.47px] items-center justify-center gap-1 after:-ml-2 [&>h2]:text-lg [&>h2]:text-white/80',
        inAnimation && 'futi-cursor',
        className,
      )}
      style={style}
    >
      <FUTIDynamicText
        className="font-ubuntu !leading-none"
        as={m.h2}
        onAnimationComplete={() => typingEvent$.emit(TypingSignatureEvent.START)}
      >
        全栈开发
      </FUTIDynamicText>
      <TypingSignature event$={typingEvent$} onAnimationComplete={() => setInAnimation(false)} />
    </div>
  );
};
