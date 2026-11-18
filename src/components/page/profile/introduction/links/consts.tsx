import { HandHeart } from 'lucide-react';
import { IconType, SiGithub, SiGmail, SiSteamdeck } from '@icons-pack/react-simple-icons';

interface ILink {
  Icon: IconType;
  href: string;
  label: string;
}

export const LINKS: ILink[] = [
  {
    Icon: SiGithub,
    href: '',
    label: 'Github',
  },
  {
    Icon: HandHeart,
    href: '',
    label: 'Donate',
  },
  {
    Icon: SiSteamdeck,
    href: '',
    label: 'Steam',
  },
  {
    Icon: SiGmail,
    href: 'mailto:mine@139.com',
    label: 'Email',
  },
];
