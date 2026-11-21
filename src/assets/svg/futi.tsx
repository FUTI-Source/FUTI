import React from 'react';

import { BasicsProps } from '@/components/type.ts';

/** 几何字标 FUTI：统一的 4 单位笔画、方正的字体骨架，末端加一个品牌蓝方形句点作为落款 */
const FutiPath: React.FC<BasicsProps<'path', 'fill'>> = (props) => (
  <path d="M4 6h16v4H8v5h10v4H8v7H4zM26 6h4v16h12V6h4v20H26zM52 6h24v4H66v16h-4V10H52zM82 6h4v20h-4z" {...props} />
);

type IFutiIconProps = BasicsProps<'svg'>;
export const FutiIcon: React.FC<IFutiIconProps> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="100" height="32" fill="none" viewBox="0 0 100 32" {...props}>
    <FutiPath fill="#fff" />
    <path d="M90 20h6v6h-6z" fill="#0295e5" />
  </svg>
);
