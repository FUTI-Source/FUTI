import React from 'react';

import type { IconType } from '@icons-pack/react-simple-icons';
import { AnimatePresence } from 'motion/react';
import * as m from 'motion/react-m';

import { buttonVariants } from '@/components/ui/button.tsx';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip.tsx';

import { LINKS } from './consts.tsx';
import { BasicsProps } from '@/components/type';

import { cn } from '@/lib/utils';

type ILinksProps = BasicsProps & {
  onEmailClick: (href: string) => void;
  onDonateClick: () => void;
};

type ITriggerProps = {
  Icon: IconType;
  label: string;
  iconClassName?: string;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
};

const itemVariants = {
  hidden: { opacity: 0, y: -10 },
  visible: { opacity: 1, y: 0 },
};

const ActionTrigger: React.FC<ITriggerProps> = ({ Icon, label, iconClassName, onClick }) => (
  <m.button
    type="button"
    variants={itemVariants}
    aria-label={label}
    aria-haspopup="dialog"
    className={cn(
      buttonVariants({ variant: 'ghost' }),
      'group hover:!bg-accent/20 cursor-pointer text-base font-bold text-[#ecf6ff]/85 hover:text-white max-sm:px-2',
    )}
    onClick={onClick}
  >
    <Icon className={iconClassName ?? 'size-4 fill-[#ecf6ff] stroke-[#ecf6ff]/85'} />
    {label}
  </m.button>
);

export const Links: React.FC<ILinksProps> = ({ className, style, onEmailClick, onDonateClick }) => (
  <AnimatePresence>
    <m.div
      className={cn(
        'flex flex-wrap justify-center gap-x-4 gap-y-1 max-sm:w-full max-sm:max-w-[22rem] max-sm:px-2 max-sm:gap-x-1',
        className,
      )}
      style={style}
      variants={{
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { duration: 0.2, staggerChildren: 0.1, delayChildren: 0.6 } },
      }}
      initial="hidden"
      animate="visible"
    >
      {LINKS.map(({ id, Icon, href, label }, i) => {
        if (id === 'email') {
          return (
            <ActionTrigger
              key={i}
              Icon={Icon}
              label={label}
              onClick={() => onEmailClick(href)}
            />
          );
        }

        if (id === 'donate') {
          return (
            <ActionTrigger
              key={i}
              Icon={Icon}
              label={label}
              iconClassName="size-4 text-[#ecf6ff]/85"
              onClick={onDonateClick}
            />
          );
        }

        const className = cn(
          buttonVariants({ variant: 'ghost' }),
          'group cursor-pointer text-base font-bold text-[#ecf6ff]/85 hover:!bg-accent/20 hover:text-white max-sm:px-2',
        );
        const icon = <Icon className="size-4 fill-[#ecf6ff] stroke-[#ecf6ff]/85" />;

        if (!href) {
          return (
            <Tooltip key={i}>
              <TooltipTrigger asChild>
                <span
                  aria-disabled="true"
                  className={cn(
                    className,
                    'cursor-not-allowed opacity-45 hover:!bg-transparent',
                  )}
                >
                  {icon}
                  {label}
                </span>
              </TooltipTrigger>
              <TooltipContent sideOffset={16}>链接尚未配置</TooltipContent>
            </Tooltip>
          );
        }

        return (
          <m.a
            key={i}
            href={href}
            target="_blank"
            className={className}
            rel="noreferrer"
            data-umami-event="social-link"
            data-umami-event-platform={id}
            variants={{ hidden: { opacity: 0, y: -10 }, visible: { opacity: 1, y: 0 } }}
          >
            {icon}
            {label}
          </m.a>
        );
      })}
    </m.div>
  </AnimatePresence>
);
