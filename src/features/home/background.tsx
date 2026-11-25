import React, { useEffect, useRef, useState } from 'react';

import type Parallax from 'parallax-js';

import { BasicsProps } from '@/components/types';

import backgroundLeftImage from '@/assets/background-left.webp';
import backgroundRightImage from '@/assets/background-right.webp';
import useDebounceEffect from '@/hooks/use-debounce-effect';
import useMemoizedFn from '@/hooks/use-memoized-fn';
import { cn } from '@/lib/utils';
import Image from 'next/image';

type IDetroitBackgroundProps = BasicsProps;

export const DetroitBackground: React.FC<IDetroitBackgroundProps> = () => {
  const node = useRef<HTMLDivElement>(null);
  const leftImage = useRef<HTMLImageElement>(null);
  const rightImage = useRef<HTMLImageElement>(null);

  const [isLeftLoaded, setIsLeftLoaded] = useState(false);
  const [isRightLoaded, setIsRightLoaded] = useState(false);

  // 等浏览器真正解码完成再显示，避免 AVIF 大图在解码完成前先绘制一帧空白或半成品，
  // 配合 opacity 过渡把「凭空出现」变成淡入。
  const revealImage = useMemoizedFn((image: HTMLImageElement | null, reveal: () => void) => {
    if (!image) {
      reveal();
      return;
    }
    void image
      .decode()
      .catch(() => undefined)
      .finally(reveal);
  });

  useEffect(() => {
    // 图片可能在水合前就已完成加载，onLoad 会被错过；
    // decode() 对已缓存和仍在加载的图片都有效，这里直接补一次，避免一直停在 opacity-0。
    revealImage(leftImage.current, () => setIsLeftLoaded(true));
    revealImage(rightImage.current, () => setIsRightLoaded(true));
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
      className="fixed top-[calc(-1*var(--safe-top))] right-0 bottom-[calc(-1*var(--safe-bottom))] left-0 z-[-1] overflow-hidden after:absolute after:top-0 after:left-0 after:size-full after:backdrop-blur"
    >
      <Image
        ref={leftImage}
        src={backgroundLeftImage}
        alt=""
        className={cn(
          'absolute !-top-8 !-left-20 h-[calc(100%+4rem)] w-[35vw] bg-linear-to-b from-gray-50/20 to-gray-200/20 transition-opacity duration-500 ease-out max-sm:!-left-10 max-sm:object-cover max-sm:object-right',
          isLeftLoaded ? 'opacity-100' : 'opacity-0',
        )}
        data-depth="0.2"
        sizes="35vw"
        quality={80}
        loading="eager"
        decoding="async"
        onLoad={(event) => revealImage(event.currentTarget, () => setIsLeftLoaded(true))}
      />
      <Image
        ref={rightImage}
        src={backgroundRightImage}
        alt=""
        className={cn(
          'absolute !-top-[2rem] !left-[26vw] h-[calc(100%+5rem)] w-[80vw] bg-linear-to-b from-gray-50/20 to-gray-200/20 transition-opacity duration-500 ease-out max-sm:!left-[20vw] max-sm:object-cover max-sm:object-left',
          isRightLoaded ? 'opacity-100' : 'opacity-0',
        )}
        data-depth="0.3"
        sizes="80vw"
        quality={80}
        priority
        decoding="async"
        onLoad={(event) => revealImage(event.currentTarget, () => setIsRightLoaded(true))}
      />
    </div>
  );
};
