import * as React from 'react';

import { cn } from '@/lib/utils';

const ScrollArea = ({ className, children, ...props }: React.ComponentProps<'div'>) => {
  return (
    <div data-slot="scroll-area" className={cn('relative overflow-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden', className)} {...props}>
      {children}
    </div>
  );
};

export { ScrollArea };
