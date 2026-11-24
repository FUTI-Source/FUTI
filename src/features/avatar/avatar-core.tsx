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

import { BasicsProps } from '@/components/types';

import { EventEmitter } from '@/hooks/use-event-emitter';

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
      contextEvent.preventDefault();
      event$?.emit(AvatarEvent.CONTEXT_LOST);
    };
    const handleContextRestored = () => {
      event$?.emit(AvatarEvent.CONTEXT_RESTORED);
    };

    canvas.addEventListener('webglcontextlost', handleContextLost);
    canvas.addEventListener('webglcontextrestored', handleContextRestored);

    const destroy = () => {
      if (model) {
        model.parent?.removeChild(model);
        model.destroy({ children: true, texture: false, baseTexture: false });
        model = null;
      }

      if (pixiApp && initialized) {
        pixiApp.destroy(false, { children: true });
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
        });
        initialized = true;

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
