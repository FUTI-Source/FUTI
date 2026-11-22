import React from 'react';

import { BasicsProps } from '@/components/type.ts';
import { SITE_BRAND } from '@/lib/site';

type IBrandMarkProps = BasicsProps<'svg'>;
export const BrandMark: React.FC<IBrandMarkProps> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="88" height="32" fill="none" viewBox="0 0 88 32" {...props}>
    <text
      x="44"
      y="25"
      fill="#fff"
      fontFamily="Ubuntu, sans-serif"
      fontSize="26"
      fontWeight="700"
      letterSpacing="2"
      textAnchor="middle"
    >
      {SITE_BRAND}
    </text>
  </svg>
);
