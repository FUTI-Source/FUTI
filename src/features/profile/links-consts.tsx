import { HandHeart } from 'lucide-react';
import { IconType, SiGithub, SiGmail, SiRss } from '@icons-pack/react-simple-icons';

import { SITE_SOCIAL_LINKS } from '~/site.config';

interface ILink {
  /** 稳定的英文标识，用于埋点与逻辑判断，避免依赖展示文案 */
  id: string;
  Icon: IconType;
  /** 仅社交链接使用；操作按钮（打赏/留言）没有跳转地址 */
  href?: string;
  label: string;
}

/**
 * 社交链接：完全由 site.config.ts 的 SITE_SOCIAL_LINKS 驱动。
 * 地址留空时按钮仍会渲染，但置灰并提示“链接尚未配置”。
 */
const SOCIAL_LINKS: ILink[] = [
  {
    id: 'blog',
    Icon: SiRss,
    href: SITE_SOCIAL_LINKS.blog,
    label: '博客',
  },
  {
    id: 'github',
    Icon: SiGithub,
    href: SITE_SOCIAL_LINKS.github,
    label: '开源',
  },
];

/**
 * 交互按钮：打赏与留言是站点的固定入口，属于必选项。
 * 不允许通过配置隐藏、移除或改名；如需调整只能改这里的代码。
 */
const ACTION_LINKS: ILink[] = [
  {
    id: 'donate',
    Icon: HandHeart,
    label: '打赏',
  },
  {
    id: 'contact',
    Icon: SiGmail,
    label: '留言',
  },
];

/** 社交链接在前、固定操作按钮在后；两者职责分离，避免误把必选项配置掉 */
export const LINKS: ILink[] = [...SOCIAL_LINKS, ...ACTION_LINKS];
