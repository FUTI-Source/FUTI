'use client';
import React, { useEffect } from 'react';

import { logger } from '@/lib/logger';
import type { MotionProps } from 'motion/react';
import * as m from 'motion/react-m';
import { Application } from '@pixi/app';
import { BatchRenderer, extensions } from '@pixi/core';
import { Ticker, TickerPlugin } from '@pixi/ticker';
import { Live2DModel } from '@/features/avatar/live2d';

import { AvatarEvent } from './events';

import { BasicsProps } from '@/components/ui/types';

import { EventEmitter } from '@/hooks/use-event-emitter';
import { PAGE_RESTORE_EVENT } from '@/lib/app-events';

extensions.add(BatchRenderer, TickerPlugin);
Live2DModel.registerTicker(Ticker);

type IAvatarCoreProps = BasicsProps<'canvas'> &
  MotionProps & {
    event$?: EventEmitter<AvatarEvent>;
  };

// 与原始 256px 画布设计保持一致的构图比例，随画布等比缩放。
const BASE_SIZE = 256;

const AvatarCore: React.FC<IAvatarCoreProps> = ({ event$, ...rest }) => {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let disposed = false;
    let initialized = false;
    let contextLost = false;
    let pixiApp: Application | null = null;
    let model: Live2DModel | null = null;
    let initialization: Promise<void> | null = null;

    // 以原始 256px 构图为准按宽度等比缩放，画布变化时保持同样的取景。
    const applyModelLayout = (width: number) => {
      if (!model) return;
      const ratio = width / BASE_SIZE;

      model.scale.set(0.125 * ratio);
      model.position.set(-70 * ratio, 10 * ratio);
    };

    const handleContextLost = (contextEvent: Event) => {
      // 必须 preventDefault，浏览器才会尝试恢复上下文；否则 canvas 永久失效
      contextEvent.preventDefault();
      contextLost = true;
      // 上下文已经失效，继续跑 ticker 只会在失效的 GL 上反复提交绘制
      pixiApp?.ticker.stop();
      event$?.emit(AvatarEvent.CONTEXT_LOST);
    };
    const handleContextRestored = () => {
      contextLost = false;
      event$?.emit(AvatarEvent.CONTEXT_RESTORED);
    };

    // 页面不可见时暂停渲染：后台标签页仍持续跑每帧绘制会占住 GPU，
    // 在 GPU 重置 / 休眠唤醒时更容易触发 "WebGL context was lost"。
    const syncTicker = () => {
      if (!pixiApp || contextLost) return;
      if (document.visibilityState === 'hidden') {
        pixiApp.ticker.stop();
      } else {
        pixiApp.ticker.start();
      }
    };

    canvas.addEventListener('webglcontextlost', handleContextLost);
    canvas.addEventListener('webglcontextrestored', handleContextRestored);
    document.addEventListener('visibilitychange', syncTicker);
    // bfcache 恢复不一定触发 visibilitychange：这里补一次 ticker 校正，
    // 避免健康实例因为「恢复时不再重建」而停在暂停状态。
    window.addEventListener(PAGE_RESTORE_EVENT, syncTicker);

    const destroy = () => {
      try {
        if (model) {
          model.parent?.removeChild(model);
          model.destroy({ children: true, texture: false, baseTexture: false });
        }

        if (pixiApp && initialized) {
          pixiApp.destroy(false, { children: true });
        }
      } catch (error) {
        // 上下文丢失后销毁纹理/渲染器可能抛错，组件即将整体重建，忽略即可
        logger.debug('虚拟形象销毁时出错（已忽略）', error);
      } finally {
        model = null;
        pixiApp = null;
        initialized = false;
      }
    };

    const initialize = async (width: number, height: number) => {
      try {
        pixiApp = new Application({
          view: canvas,
          width,
          height,
          backgroundColor: 0x000000,
          backgroundAlpha: 0,
          resolution: 1,
          antialias: true,
          // Live2D 只有一层 2D 合成，用集显更省电也更稳：
          // 双显卡笔记本切独显时，驱动重置是 Firefox 丢 context 的常见来源
          powerPreference: 'low-power',
          preserveDrawingBuffer: false,
        });
        initialized = true;
        syncTicker();

        if (disposed) {
          destroy();
          return;
        }

        model = await Live2DModel.from(
          '/live2d/character/character.model3.json',
          { autoInteract: false },
        );

        if (disposed) {
          destroy();
          return;
        }

        model.anchor.set(0, 0);

        pixiApp.stage.addChild(model);
        applyModelLayout(pixiApp.screen.width);
        event$?.emit(AvatarEvent.INIT);
      } catch (error) {
        destroy();
        if (disposed) return;

        logger.warn('虚拟形象初始化失败，保留静态形象', error);
        event$?.emit(AvatarEvent.FAILED);
      }
    };

    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const { width, height } = entry.contentRect;
      if (disposed || width <= 0 || height <= 0) return;

      if (pixiApp) {
        pixiApp.renderer.resize(width, height);
        applyModelLayout(width);
      } else if (!initialization) {
        initialization = initialize(width, height);
      }
    });
    resizeObserver.observe(canvas);

    return () => {
      disposed = true;
      resizeObserver.disconnect();
      canvas.removeEventListener('webglcontextlost', handleContextLost);
      canvas.removeEventListener('webglcontextrestored', handleContextRestored);
      document.removeEventListener('visibilitychange', syncTicker);
      window.removeEventListener(PAGE_RESTORE_EVENT, syncTicker);
      if (initialization) {
        void initialization.then(destroy);
      } else {
        destroy();
      }
    };
  }, [event$]);

  return <m.canvas ref={canvasRef} {...rest} />;
};

export default AvatarCore;
