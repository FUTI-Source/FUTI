import React from 'react';

import * as m from 'motion/react-m';

import { Separator } from '@/components/ui/separator.tsx';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip.tsx';

import { BasicsProps } from '@/components/type';

import { cn } from '@/lib/utils.ts';
import { ICP_LINK, ICP_NUMBER } from '@/lib/site';
import Link from 'next/link';

type IFooterProps = BasicsProps;

export const Footer: React.FC<IFooterProps> = ({ className, style }) => {
  return (
    <div className={cn('futi-footer flex h-16 shrink-0 items-center gap-4 pl-6 max-sm:h-auto max-sm:min-h-16 max-sm:w-full max-sm:flex-col max-sm:items-center max-sm:gap-3 max-sm:pt-6 max-sm:pb-4 max-sm:pl-0', className)} style={style}>
      <m.div className="max-sm:w-full max-sm:px-[clamp(0.75rem,4vw,1.5rem)]" initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { delay: 1.2 } }} transition={{ duration: 0.2 }}>
        <Separator className="futi-footer-line mb-0.5 h-[3px] rounded bg-transparent max-sm:my-2" />
        <div className="futi-footer-text flex gap-1 space-x-1 text-xs select-none max-sm:w-full max-sm:flex-col max-sm:items-center max-sm:gap-2 max-sm:pb-0 max-sm:text-center [&_a]:cursor-pointer [&_a]:font-bold [&_a]:text-[color:var(--futi-c-footer-link)] [&_p]:text-[color:var(--futi-c-footer)]">
          <p className="max-sm:max-w-full max-sm:text-center">
            Copyright &copy; 2017 - {new Date().getFullYear()}
            <Tooltip>
              <TooltipTrigger asChild>
                <Link href="/" className="mx-1">
                  张文涛
                </Link>
              </TooltipTrigger>
              <TooltipContent sideOffset={16}>🙃 Independent Websites Developer</TooltipContent>
            </Tooltip>
            All rights reserved.
          </p>
          <p className="max-sm:hidden">/</p>
          {ICP_NUMBER && (
            <Tooltip>
              <TooltipTrigger asChild>
                <a href={ICP_LINK} target="_blank" rel="noreferrer">
                  {ICP_NUMBER}
                </a>
              </TooltipTrigger>
              <TooltipContent sideOffset={16}>工信部 ICP 备案</TooltipContent>
            </Tooltip>
          )}
        </div>
      </m.div>
    </div>
  );
};
