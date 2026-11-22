import React, { useEffect, useState } from 'react';

import { BasicsProps } from '@/components/type.ts';

import { cn } from '@/lib/utils';

const SIGNATURE = '分享 · 开源 · 实践';
const TYPING_SPEED = 15;
const HOLD_AFTER_TYPING = 200;

/** 完整文案（分段渲染，间隔号为强调色），供静态副本复用 */
const SignatureText = () => (
  <>
    {SIGNATURE.split('·').map((part, index) => (
      <React.Fragment key={index}>
        {index > 0 && <span className="text-[#0295e5]">·</span>}
        {part}
      </React.Fragment>
    ))}
  </>
);

type ITypingSignatureProps = {
  onAnimationComplete?: () => void;
};

const TypingSignature: React.FC<ITypingSignatureProps> = ({ onAnimationComplete }) => {
  const [text, setText] = useState('');

  useEffect(() => {
    // 自动化环境（部署预览截图）不跑打字机，直接显示完整文案
    if (document.documentElement.classList.contains('preload-skip')) {
      setText(SIGNATURE);
      onAnimationComplete?.();
      return;
    }

    let timer = 0;
    let index = 0;

    const tick = () => {
      index += 1;
      setText(SIGNATURE.slice(0, index));
      timer = window.setTimeout(
        index < SIGNATURE.length ? tick : () => onAnimationComplete?.(),
        index < SIGNATURE.length ? TYPING_SPEED : HOLD_AFTER_TYPING,
      );
    };

    timer = window.setTimeout(tick, TYPING_SPEED);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <h2 className="font-mono text-lg font-normal text-[#ecf6ff]/85">
      {text.split('·').map((part, index) => (
        <React.Fragment key={index}>
          {index > 0 && <span className="text-[#0295e5]">·</span>}
          {part}
        </React.Fragment>
      ))}
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
        // min-width 由 .profile-description 统一控制，避免逐字出现时整行左右抖动。
        'profile-description relative flex h-7 w-fit items-center justify-center gap-1',
        inAnimation && 'futi-cursor',
        className,
      )}
      style={style}
    >
      <TypingSignature onAnimationComplete={() => setInAnimation(false)} />
      {/* 静态副本：仅在自动化环境（部署截图）下显示，SSR 即可见，不依赖水合与打字动画 */}
      <span
        aria-hidden="true"
        className="profile-description-static absolute inset-0 items-center justify-center font-mono text-lg font-normal text-[#ecf6ff]/85"
      >
        <SignatureText />
      </span>
    </div>
  );
};
