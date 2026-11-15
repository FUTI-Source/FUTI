// consts.tsx
import GithubIcon from '@/icons/github';
import EmailIcon from '@/icons/email';
import ContactDialog from '@/components/ContactDialog';

import type { ReactNode } from 'react';

type LinkItem = {
  label: string;
  Icon: React.FC<{ className?: string }>;
  // 二选一
  href?: string;
  component?: ReactNode;
};

export const LINKS: LinkItem[] = [
  {
    label: 'GitHub',
    href: 'https://github.com/xxxx',
    Icon: GithubIcon,
  },
  {
    label: 'Email',
    Icon: EmailIcon,
    component: <ContactDialog />,
  },
];
