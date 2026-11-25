'use client';

import React, { lazy, Suspense, useEffect, useRef, useState } from 'react';

import { AnimatePresence } from 'motion/react';
import * as m from 'motion/react-m';

import { Loading } from './loading';

import { BasicsProps } from '@/components/ui/types';

import useEventEmitter, { EventEmitter } from '@/hooks/use-event-emitter';
import useExternal from '@/hooks/use-external';
import { PAGE_RESTORE_EVENT } from '@/lib/app-events';

import { AvatarEvent } from './events';

const AvatarCore = lazy(() => import('./avatar-core.tsx'));

/** 后台恢复后初始化超时：超时就退回静态形象，避免 WebGL context 未恢复时一直转圈 */
const RESTORE_INIT_TIMEOUT_MS = 8000;

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
  const initRef = useRef(false);
  const setInitState = React.useCallback((ready: boolean) => {
    initRef.current = ready;
    setInit(ready);
  }, []);
  const [instanceKey, setInstanceKey] = useState(0);
  const restart = React.useCallback(() => {
    setInitState(false);
    setFailed(false);
    setInstanceKey((current) => current + 1);
    event$?.emit(AvatarEvent.LOADING);
  }, [event$, setInitState]);

  // 后台恢复只认协调器的统一信号；restart 后加超时兜底，
  // 若 WebGL context 长时间后台丢失、初始化事件没回来，就退回静态形象而不是一直转圈。
  useEffect(() => {
    let restoreTimer: number | undefined;

    const handleRestore = () => {
      restart();
      if (restoreTimer !== undefined) window.clearTimeout(restoreTimer);
      restoreTimer = window.setTimeout(() => {
        // 8 秒仍未 INIT，说明这次恢复初始化卡死，走失败态显示静态形象
        if (!initRef.current) {
          setFailed(true);
          event$?.emit(AvatarEvent.FAILED);
        }
      }, RESTORE_INIT_TIMEOUT_MS);
    };

    window.addEventListener(PAGE_RESTORE_EVENT, handleRestore);
    return () => {
      if (restoreTimer !== undefined) window.clearTimeout(restoreTimer);
      window.removeEventListener(PAGE_RESTORE_EVENT, handleRestore);
    };
  }, [restart, event$]);

  const avatarEvent$ = useEventEmitter<AvatarEvent>();
  avatarEvent$.useSubscription((target) => {
    switch (target) {
      case AvatarEvent.CONTEXT_LOST: {
        setInitState(false);
        event$?.emit(AvatarEvent.LOADING);
        break;
      }
      case AvatarEvent.CONTEXT_RESTORED: {
        restart();
        break;
      }
      case AvatarEvent.INIT: {
        setInitState(true);
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
