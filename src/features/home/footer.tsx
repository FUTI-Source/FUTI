import React from 'react';

import * as m from 'motion/react-m';

import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

import { BasicsProps } from '@/components/ui/types';

import { cn } from '@/lib/utils';
import {
  ICP_LINK,
  ICP_NUMBER,
  SITE_AUTHOR_NAME,
  SITE_COPYRIGHT_START,
  SITE_JOB_TITLE_EN,
} from '@/config/site';
import Link from 'next/link';

type IFooterProps = BasicsProps;

export const Footer: React.FC<IFooterProps> = ({ className, style }) => {
  return (
    <div className={cn('footer font-playful flex h-16 shrink-0 items-center gap-4 pl-[var(--desktop-edge-inset)] max-sm:h-auto max-sm:min-h-16 max-sm:w-full max-sm:flex-col max-sm:items-center max-sm:gap-3 max-sm:pt-6 max-sm:pb-4 max-sm:pl-0', className)} style={style}>
      <Tooltip>
        <TooltipTrigger asChild>
          <m.div
            className="footer-credit flex h-7 shrink-0 items-center justify-center gap-1 select-none sm:h-auto sm:flex-col sm:items-start sm:justify-start sm:gap-0.5"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { delay: 1 } }}
            transition={{ duration: 0.2 }}
          >
            <span className="footer-credit-label font-playful text-[15px] leading-tight tracking-[0.04em] whitespace-nowrap text-white/40 transition-colors duration-300 max-sm:hidden sm:text-xs">
              Drawn by
            </span>
            <span className="footer-credit-brand font-playful text-[15px] leading-tight tracking-[0.04em] whitespace-nowrap text-white/55 transition-colors duration-300 sm:text-xs">
              NAVILAB
            </span>
          </m.div>
        </TooltipTrigger>
        <TooltipContent sideOffset={12}>由 NAVILAB 绘制</TooltipContent>
      </Tooltip>

      <m.div className="max-sm:!hidden" initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { delay: 1.1 } }} transition={{ duration: 0.2 }}>
        <Separator orientation="vertical" className="!h-8 bg-[color:var(--hairline)]" />
      </m.div>
      <m.div className="max-sm:w-full max-sm:px-[clamp(0.75rem,4vw,1.5rem)] sm:translate-y-1" initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { delay: 1.2 } }} transition={{ duration: 0.2 }}>
        <Separator className="footer-line mb-0.5 h-[3px] rounded bg-transparent max-sm:my-1" />
        <div className="footer-text font-playful flex gap-1 space-x-1 text-[13px] select-none max-sm:w-full max-sm:flex-col max-sm:items-center max-sm:gap-2 max-sm:pb-0 max-sm:text-center [&_a]:cursor-pointer [&_a]:font-bold [&_a]:text-[color:var(--text-footer-link-color)] [&_a]:transition-colors [&_a]:duration-300 [&_p]:text-[color:var(--text-footer-color)] [&_p]:transition-colors [&_p]:duration-300">
          <p className="max-sm:max-w-full max-sm:text-center">
            Copyright &copy; {SITE_COPYRIGHT_START} - {new Date().getFullYear()}
            <Tooltip>
              <TooltipTrigger asChild>
                <Link href="/" className="mx-1">
                   {SITE_AUTHOR_NAME}
                </Link>
              </TooltipTrigger>
              <TooltipContent sideOffset={16}>🙃 {SITE_JOB_TITLE_EN}</TooltipContent>
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
