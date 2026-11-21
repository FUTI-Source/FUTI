import { HandHeart } from 'lucide-react';
import { IconType, SiGithub, SiGmail, SiSteamdeck } from '@icons-pack/react-simple-icons';

import { CONTACT_EMAIL } from '@/lib/site';

interface ILink {
  /** 稳定的英文标识，用于埋点与逻辑判断，避免依赖展示文案 */
  id: string;
  Icon: IconType;
  href: string;
  label: string;
}

export const LINKS: ILink[] = [
  {
    id: 'github',
    Icon: SiGithub,
    href: '',
    label: '开源',
  },
  {
    id: 'donate',
    Icon: HandHeart,
    href: '',
    label: '打赏',
  },
  {
    id: 'steam',
    Icon: SiSteamdeck,
    href: '',
    label: '游戏',
  },
  {
    id: 'email',
    Icon: SiGmail,
    href: `mailto:${CONTACT_EMAIL}`,
    label: '邮件',
  },
];
