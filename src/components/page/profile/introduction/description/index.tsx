import React, { useState } from 'react';

import { motion } from 'framer-motion';

import { FUTIDynamicText } from '@/components/ui/dynamic-text';

import { TextDeveloper, TextDeveloperEvent } from '@/components/page/profile/introduction/description/text-developer.tsx';
import { BasicsProps } from '@/components/type.ts';

import useEventEmitter from '@/hooks/use-event-emitter.ts';
import { cn } from '@/lib/utils';

type IDescriptionProps = BasicsProps;

export const Description: React.FC<IDescriptionProps> = ({ className, style }) => {
  const [inAnimation, setInAnimation] = useState<boolean>(true);

  const typingEvent$ = useEventEmitter<TextDeveloperEvent>();

  return (
    <div
      className={cn(
        // 父级（App 里的 flex-col items-center）已负责水平居中，这里不再写 mx-auto：
        // wrapper 是收缩宽度，mx-auto 拿不到剩余空间，属于空转。
        // min-w 必须等于"打字完成后"的真实内容宽度，否则文字贴左、视觉偏左。
        'flex h-7 w-fit min-w-[245.47px] items-center gap-1 after:-ml-2 [&>h2]:text-lg [&>h2]:text-white/80',
        inAnimation && 'futi-cursor',
        className,
      )}
      style={style}
    >
      <FUTIDynamicText
        className="font-ubuntu !leading-none"
        as={motion.h2}
        onAnimationComplete={() => typingEvent$.emit(TextDeveloperEvent.START)}
      >
        A Full Stack
      </FUTIDynamicText>
      <TextDeveloper event$={typingEvent$} onAnimationComplete={() => setInAnimation(false)} />
    </div>
  );
};
