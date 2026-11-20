'use client';
import React, { useEffect } from 'react';

import { logger } from '@/lib/logger';
import type { MotionProps } from 'motion/react';
import * as m from 'motion/react-m';
import { Application } from '@pixi/app';
import { BatchRenderer, extensions } from '@pixi/core';
import { Ticker, TickerPlugin } from '@pixi/ticker';
import { Live2DModel } from 'pixi-live2d-display/cubism4';

import { Live2DEvent } from '../events';

import { BasicsProps } from '@/components/type.ts';

import { EventEmitter } from '@/hooks/use-event-emitter.ts';

extensions.add(BatchRenderer, TickerPlugin);
Live2DModel.registerTicker(Ticker);

type ILive2DCoreProps = BasicsProps<'canvas'> &
  MotionProps & {
    event$?: EventEmitter<Live2DEvent>;
  };

// 与原始 256px 画布设计保持一致的构图比例，随画布等比缩放。
const BASE_SIZE = 256;

const Live2DCore: React.FC<ILive2DCoreProps> = ({ event$, ...rest }) => {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let disposed = false;
    let initialized = false;
    let pixiApp: Application | null = null;
    let model: Live2DModel | null = null;
    let initialization: Promise<void> | null = null;

    // 以原始 256px 构图为准等比缩放，画布变化时保持同样的取景。
    const applyModelLayout = (width: number, height: number) => {
      if (!model) return;
      const ratio = Math.min(width, height) / BASE_SIZE;

      model.scale.set(0.125 * ratio);
      model.position.set(-70 * ratio, 10 * ratio);
    };

    const handleContextLost = (contextEvent: Event) => {
      contextEvent.preventDefault();
      event$?.emit(Live2DEvent.CONTEXT_LOST);
    };
    const handleContextRestored = () => {
      event$?.emit(Live2DEvent.CONTEXT_RESTORED);
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
          '/live2d/futiwolf/futi.model3.json',
          { autoInteract: false },
        );

        if (disposed) {
          destroy();
          return;
        }

        model.anchor.set(0, 0);

        pixiApp.stage.addChild(model);
        applyModelLayout(pixiApp.screen.width, pixiApp.screen.height);
        event$?.emit(Live2DEvent.INIT);
      } catch (error) {
        destroy();
        if (disposed) return;

        logger.warn('Live2D 初始化失败，保留静态形象', error);
        event$?.emit(Live2DEvent.FAILED);
      }
    };

    const resizeObserver = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (disposed || width <= 0 || height <= 0) return;

      if (pixiApp) {
        pixiApp.renderer.resize(width, height);
        applyModelLayout(width, height);
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

export default Live2DCore;
