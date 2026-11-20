import React, { useEffect, useRef, useState } from 'react';

import type Parallax from 'parallax-js';

import { BasicsProps } from '@/components/type';

import backgroundLeftImage from '@/assets/webp/background_left.webp';
import backgroundRightImage from '@/assets/webp/background_right.webp';
import useDebounceEffect from '@/hooks/use-debounce-effect.ts';
import Image from 'next/image';

type IDetroitBackgroundProps = BasicsProps;

export const DetroitBackground: React.FC<IDetroitBackgroundProps> = () => {
  const node = useRef<HTMLDivElement>(null);
  const leftImage = useRef<HTMLImageElement>(null);
  const rightImage = useRef<HTMLImageElement>(null);

  const [isLeftLoaded, setIsLeftLoaded] = useState(false);
  const [isRightLoaded, setIsRightLoaded] = useState(false);

  useEffect(() => {
    // 缓存图片可能在水合前完成加载，需要补同步加载状态。
    const left = leftImage.current;
    const right = rightImage.current;
    if (left?.complete && left.naturalWidth > 0) setIsLeftLoaded(true);
    if (right?.complete && right.naturalWidth > 0) setIsRightLoaded(true);
  }, []);

  useDebounceEffect(
    () => {
      if (isLeftLoaded && isRightLoaded && node.current) {
        let cancelled = false;
        let parallax: InstanceType<typeof Parallax> | undefined;

        void import('parallax-js').then(({ default: Parallax }) => {
          if (cancelled || !node.current) return;
          parallax = new Parallax(node.current);
        });

        return () => {
          cancelled = true;
          parallax?.destroy();
        };
      }
    },
    [isLeftLoaded, isRightLoaded],
    { wait: 100 },
  );

  return (
    <div
      ref={node}
      className="absolute top-0 left-0 z-[-1] size-full overflow-hidden after:absolute after:top-0 after:left-0 after:size-full after:backdrop-blur"
    >
      <Image
        ref={leftImage}
        src={backgroundLeftImage}
        alt=""
        className="absolute !-top-8 !-left-20 h-[calc(100dvh+4rem)] w-[35vw] bg-linear-to-b from-gray-50/20 to-gray-200/20 max-sm:!-left-10 max-sm:object-cover max-sm:object-right"
        data-depth="0.2"
        sizes="35vw"
        quality={80}
        loading="eager"
        decoding="async"
        onLoad={() => setIsLeftLoaded(true)}
      />
      <Image
        ref={rightImage}
        src={backgroundRightImage}
        alt=""
        className="absolute !-top-[2rem] !left-[26vw] h-[calc(100dvh+5rem)] w-[80vw] bg-linear-to-b from-gray-50/20 to-gray-200/20 max-sm:!left-[20vw] max-sm:object-cover max-sm:object-left"
        data-depth="0.3"
        sizes="80vw"
        quality={80}
        loading="eager"
        decoding="async"
        onLoad={() => setIsRightLoaded(true)}
      />
    </div>
  );
};
