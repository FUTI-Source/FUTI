import React from 'react';

import { AnimatePresence, motion } from 'framer-motion';

import { buttonVariants } from '@/components/ui/button.tsx';

import { LINKS } from '@/components/page/profile/introduction/links/consts.tsx';
import { BasicsProps } from '@/components/type.ts';

import { cn } from '@/lib/utils';

type ILinksProps = BasicsProps;

export const Links: React.FC<ILinksProps> = ({ className, style }) => (
  <AnimatePresence>
    <motion.div
      className={cn('flex gap-4 max-sm:gap-1', className)}
      style={style}
      variants={{
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { duration: 0.2, staggerChildren: 0.1, delayChildren: 0.6 } },
      }}
      initial="hidden"
      animate="visible"
    >
      {LINKS.map((item, i) => {
        const { Icon, href, label, component } = item;
        // 弹窗组件分支（Email留言）
        if (component) {
          return (
            <motion.div
              key={i}
              className={cn(buttonVariants({ variant: 'ghost' }), 'group hover:!bg-accent/20 cursor-pointer text-base font-bold text-[#ecf6ff]/85 hover:text-white max-sm:px-2')}
              variants={{ hidden: { opacity: 0, y: -10 }, visible: { opacity: 1, y: 0 } }}
            >
              {component}
            </motion.div>
          );
        }
        // 普通链接分支：移除 target="_blank"，只保留 rel="noreferrer"
        return (
          <motion.a
            key={i}
            href={href}
            rel="noreferrer"
            className={cn(buttonVariants({ variant: 'ghost' }), 'group hover:!bg-accent/20 cursor-pointer text-base font-bold text-[#ecf6ff]/85 hover:text-white max-sm:px-2')}
            variants={{ hidden: { opacity: 0, y: -10 }, visible: { opacity: 1, y: 0 } }}
          >
            <Icon className="size-4 fill-[#ecf6ff] stroke-[#ecf6ff]/85" />
            {label}
          </motion.a>
        );
      })}
    </motion.div>
  </AnimatePresence>
);
