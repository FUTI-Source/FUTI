'use client';

import React, { lazy, Suspense, useEffect, useState } from 'react';

import { AnimatePresence } from 'motion/react';
import * as m from 'motion/react-m';

import { Loading } from './loading';

import { BasicsProps } from '@/components/type.ts';

import useEventEmitter, { EventEmitter } from '@/hooks/use-event-emitter.ts';
import useExternal from '@/hooks/use-external.ts';

import { AvatarEvent } from '../events';

const AvatarCore = lazy(() => import('./avatar-core.tsx'));

type IAvatarProps = BasicsProps & {
  event$?: EventEmitter<AvatarEvent>;
};

const detectWebGL = (): boolean => {
  if (typeof window === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    return Boolean(
      window.WebGLRenderingContext &&
        (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')),
    );
  } catch {
    return false;
  }
};

export const Avatar: React.FC<IAvatarProps> = ({ event$ }) => {
  const [webglSupported] = useState<boolean>(detectWebGL);
  const [failed, setFailed] = useState(false);

  const cubismSDKStatus = useExternal(
    webglSupported ? '/live2d/live2dcubismcore.min.js' : undefined,
    {
      js: {
        async: true,
      },
    },
  );

  const [cubismSdkInit, setCubismSdkInit] = useState(false);
  useEffect(() => {
    if (cubismSDKStatus === 'ready') {
      setCubismSdkInit(true);
    }
  }, [cubismSDKStatus]);

  const [init, setInit] = useState(false);
  const [instanceKey, setInstanceKey] = useState(0);
  const restart = React.useCallback(() => {
    setInit(false);
    setFailed(false);
    setInstanceKey((current) => current + 1);
    event$?.emit(AvatarEvent.LOADING);
  }, [event$]);

  useEffect(() => {
    let wasHidden = document.visibilityState === 'hidden';

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        wasHidden = true;
      } else if (wasHidden) {
        wasHidden = false;
        restart();
      }
    };

    const handlePageShow = (pageEvent: PageTransitionEvent) => {
      if (pageEvent.persisted) restart();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pageshow', handlePageShow);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pageshow', handlePageShow);
    };
  }, [restart]);

  const avatarEvent$ = useEventEmitter<AvatarEvent>();
  avatarEvent$.useSubscription((target) => {
    switch (target) {
      case AvatarEvent.CONTEXT_LOST: {
        setInit(false);
        event$?.emit(AvatarEvent.LOADING);
        break;
      }
      case AvatarEvent.CONTEXT_RESTORED: {
        restart();
        break;
      }
      case AvatarEvent.INIT: {
        setInit(true);
        event$?.emit(AvatarEvent.INIT);
        // 模型已就绪：先让头像退出，模型延迟 0.2s 再淡入，避免两者叠加出现重影
        event$?.emit(AvatarEvent.SHOW);
        break;
      }
      case AvatarEvent.FAILED: {
        setFailed(true);
        event$?.emit(AvatarEvent.FAILED);
        break;
      }
    }
  });

  if (!webglSupported || failed) return null;

  return (
    <div className="relative size-full">
      <AnimatePresence>
        {!init && (
          <m.div
            key="avatar-loading"
            className="avatar-loading absolute inset-0 flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { delay: 0.2 } }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <Loading className="size-20 border-4" insideClassName="border-[3px]" />
          </m.div>
        )}
        <Suspense fallback={null}>
          {cubismSdkInit && (
            <AvatarCore
              key={`avatar-${instanceKey}`}
              className="size-full"
              initial={{ opacity: 0 }}
              animate={{ opacity: init ? 1 : 0 }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
              event$={avatarEvent$}
            />
          )}
        </Suspense>
      </AnimatePresence>
    </div>
  );
};
