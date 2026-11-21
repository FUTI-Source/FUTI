import React from 'react';

import type { MotionProps } from 'motion/react';
import * as m from 'motion/react-m';

import { Separator } from '@/components/ui/separator.tsx';

import { BasicsProps } from '@/components/type.ts';

import { cn } from '@/lib/utils';

type INameProps = BasicsProps & MotionProps;

export const Name: React.FC<INameProps> = ({ className, style, ...rest }) => (
  <m.div className={cn('flex h-[clamp(2.75rem,7vh,3rem)] flex-col justify-center gap-2', className)} style={style} {...rest}>
    <h1 className="profile-title font-kanit !m-0 my-0 px-4 font-light text-white/90">
      <span className="inline-block tracking-[0.3em]">FUTI</span>
    </h1>
    <Separator className="futi-profile-line !h-[3px] w-full rounded shadow" />
  </m.div>
);
