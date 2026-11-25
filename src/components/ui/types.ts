import React, { CSSProperties, ReactNode } from 'react';

type DefaultProps = 'className' | 'style' | 'ref';

export type BasicsProps<T extends keyof React.JSX.IntrinsicElements = 'div', K extends Exclude<keyof React.ComponentPropsWithRef<T>, DefaultProps> = never> = Pick<
  React.ComponentPropsWithRef<T>,
  DefaultProps | K
>;

export type AsComp =
  | keyof React.JSX.IntrinsicElements
  | React.ComponentType<{
      style: CSSProperties;
      children: ReactNode;
    }>;
