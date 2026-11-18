import React, { lazy, Suspense, useState } from 'react';

import type { IconType } from '@icons-pack/react-simple-icons';
import { AnimatePresence } from 'motion/react';
import * as m from 'motion/react-m';

import { buttonVariants } from '@/components/ui/button.tsx';

import { LINKS } from '@/components/page/profile/introduction/links/consts.tsx';
import { BasicsProps } from '@/components/type';

import { cn } from '@/lib/utils';

const EmailLink = lazy(() =>
  import('@/components/page/profile/introduction/links/email-dialog.tsx').then(
    ({ EmailLink: Component }) => ({ default: Component }),
  ),
);

type ILinksProps = BasicsProps;

type IEmailLinkProps = {
  Icon: IconType;
  href: string;
  label: string;
};

const itemVariants = {
  hidden: { opacity: 0, y: -10 },
  visible: { opacity: 1, y: 0 },
};

const EmailTrigger: React.FC<
  IEmailLinkProps & { onClick?: React.MouseEventHandler<HTMLButtonElement> }
> = ({ Icon, label, onClick }) => (
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
    <Icon className="size-4 fill-[#ecf6ff] stroke-[#ecf6ff]/85" />
    {label}
  </m.button>
);

const DeferredEmailLink: React.FC<IEmailLinkProps> = (props) => {
  const [activated, setActivated] = useState(false);

  if (!activated) {
    return <EmailTrigger {...props} onClick={() => setActivated(true)} />;
  }

  return (
    <Suspense fallback={<EmailTrigger {...props} />}>
      <EmailLink {...props} initialOpen />
    </Suspense>
  );
};

export const Links: React.FC<ILinksProps> = ({ className, style }) => (
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
      {LINKS.map(({ Icon, href, label }, i) => {
        if (label === 'Email') {
          return <DeferredEmailLink key={i} Icon={Icon} href={href} label={label} />;
        }

        const className = cn(
          buttonVariants({ variant: 'ghost' }),
          'group cursor-pointer text-base font-bold text-[#ecf6ff]/85 hover:!bg-accent/20 hover:text-white max-sm:px-2',
        );
        const icon = (
          <Icon
            className={
              label === 'Donate'
                ? 'size-4 text-[#ecf6ff]/85'
                : 'size-4 fill-[#ecf6ff] stroke-[#ecf6ff]/85'
            }
          />
        );

        if (!href) {
          return (
            <span
              key={i}
              aria-disabled="true"
              title="链接尚未配置"
              className={cn(
                className,
                'cursor-not-allowed opacity-45 hover:!bg-transparent',
              )}
            >
              {icon}
              {label}
            </span>
          );
        }

        return (
          <m.a
            key={i}
            href={href}
            target="_blank"
            className={className}
            rel="noreferrer"
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
