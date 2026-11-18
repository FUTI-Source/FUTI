'use client';

import React, { lazy, Suspense, useEffect, useState } from 'react';

import { AnimatePresence } from 'motion/react';

import { Loading } from '@/components/ui/loading';

import { BasicsProps } from '@/components/type.ts';

import useEventEmitter, { EventEmitter } from '@/hooks/use-event-emitter.ts';
import useExternal from '@/hooks/use-external.ts';

const Live2DCore = lazy(() => import('./core.tsx'));

export enum Live2DEvent {
  LOADING = 'loading',
  INIT = 'init',
  SHOW = 'show',
  FAILED = 'failed',
  CONTEXT_LOST = 'context-lost',
  CONTEXT_RESTORED = 'context-restored',
}

type ILive2DProps = BasicsProps & {
  event$?: EventEmitter<Live2DEvent>;
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

export const Live2D: React.FC<ILive2DProps> = ({ event$ }) => {
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
    event$?.emit(Live2DEvent.LOADING);
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

  const live2dEvent$ = useEventEmitter<Live2DEvent>();
  live2dEvent$.useSubscription((target) => {
    switch (target) {
      case Live2DEvent.CONTEXT_LOST: {
        setInit(false);
        event$?.emit(Live2DEvent.LOADING);
        break;
      }
      case Live2DEvent.CONTEXT_RESTORED: {
        restart();
        break;
      }
      case Live2DEvent.INIT: {
        setInit(true);
        event$?.emit(Live2DEvent.INIT);
        break;
      }
      case Live2DEvent.FAILED: {
        setFailed(true);
        event$?.emit(Live2DEvent.FAILED);
        break;
      }
    }
  });

  if (!webglSupported || failed) return null;

  return (
    <div className="relative size-64">
      <AnimatePresence>
        {!init && (
          <Loading
            key="futi-live2d-loading"
            className="absolute top-4 right-4 size-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { delay: 0.2 } }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          />
        )}
        <Suspense fallback={null}>
          {cubismSdkInit && (
            <Live2DCore
              key={`futi-live2d-${instanceKey}`}
              className="size-64"
              initial={{ opacity: 0 }}
              animate={{ opacity: init ? 1 : 0, transition: { delay: 0.2 } }}
              transition={{ duration: 0.2 }}
              onAnimationComplete={() => event$?.emit(Live2DEvent.SHOW)}
              event$={live2dEvent$}
            />
          )}
        </Suspense>
      </AnimatePresence>
    </div>
  );
};
