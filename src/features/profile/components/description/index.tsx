import React, { useEffect, useRef, useState } from 'react';

import { BasicsProps } from '@/components/type.ts';

import useMemoizedFn from '@/hooks/use-memoized-fn.ts';
import { cn } from '@/lib/utils';

type ITypingSignatureProps = BasicsProps<'h2'> & {
  onAnimationComplete?: () => void;
};

const SIGNATURE = '分享 · 开源 · 实践';
const TYPING_SPEED = 15;
const HOLD_AFTER_TYPING = 200;

const TypingSignature: React.FC<ITypingSignatureProps> = ({ onAnimationComplete, className, style }) => {
  const timer = useRef<number | undefined>(undefined);
  const started = useRef<boolean>(false);
  const text = useRef<string>('');

  const [inAnimation, setInAnimation] = useState<boolean>(true);
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

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    step();
    return () => {
      clearTimeout(timer.current);
      started.current = false;
    };
  }, []);

  const content = displayedText.trim();
  const codeClassName = cn(
    '[&>pre]:!font-mono [&>pre]:rounded [&>pre]:!bg-transparent [&>pre]:px-1.5 [&>pre]:transition-colors hover:[&>pre]:!bg-black/20',
    inAnimation && '[&>pre]:!bg-black/20',
    className,
  );

  return (
    <h2 className={codeClassName} style={style}>
      <pre>
        <code className="tracking-[0.02em] text-[#d7dae0]">
          {content.split('').map((char, i) =>
            char === '·' ? (
              <span key={i} className="text-[#528bff]">
                {char}
              </span>
            ) : (
              char
            ),
          )}
        </code>
      </pre>
    </h2>
  );
};

type IDescriptionProps = BasicsProps;

export const Description: React.FC<IDescriptionProps> = ({ className, style }) => {
  const [inAnimation, setInAnimation] = useState<boolean>(true);

  return (
    <div
      className={cn(
        // 父级（App 里的 flex-col items-center）已负责水平居中；
        // min-w 保持与打字完成后的宽度一致，避免逐字出现时整行左右抖动。
        'profile-description flex h-7 w-fit min-w-[245.47px] items-center justify-center gap-1 after:-ml-2',
        inAnimation && 'futi-cursor',
        className,
      )}
      style={style}
    >
      <TypingSignature onAnimationComplete={() => setInAnimation(false)} />
    </div>
  );
};
