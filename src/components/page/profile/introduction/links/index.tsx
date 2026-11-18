import React from 'react';

import { AnimatePresence, motion } from 'motion/react';

import { buttonVariants } from '@/components/ui/button.tsx';

import { LINKS } from '@/components/page/profile/introduction/links/consts.tsx';
import { EmailLink } from '@/components/page/profile/introduction/links/email-dialog.tsx';
import { BasicsProps } from '@/components/type';

import { cn } from '@/lib/utils';

type ILinksProps = BasicsProps;

export const Links: React.FC<ILinksProps> = ({ className, style }) => (
  <AnimatePresence>
    <motion.div
      className={cn(
        'flex flex-wrap justify-center gap-x-4 gap-y-1 max-sm:w-full max-sm:px-2 max-sm:gap-x-1',
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
          return <EmailLink key={i} Icon={Icon} href={href} label={label} />;
        }

        const className = cn(
          buttonVariants({ variant: 'ghost' }),
          'group cursor-pointer text-base font-bold text-[#ecf6ff]/85 hover:!bg-accent/20 hover:text-white max-sm:px-2',
        );
        const icon = (
          <Icon className="size-4 fill-[#ecf6ff] stroke-[#ecf6ff]/85" />
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
          <motion.a
            key={i}
            href={href}
            target="_blank"
            className={className}
            rel="noreferrer"
            variants={{ hidden: { opacity: 0, y: -10 }, visible: { opacity: 1, y: 0 } }}
          >
            {icon}
            {label}
          </motion.a>
        );
      })}
    </motion.div>
  </AnimatePresence>
);
