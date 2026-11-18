'use client';
import React, { useEffect } from 'react';

import { logger } from '@/lib/logger';
import { motion, MotionProps } from 'motion/react';
import { Application } from 'pixi.js';
import { Live2DModel } from '@jannchie/pixi-live2d-display/cubism4';

import { Live2DEvent } from '@/components/ui/live2d/index.tsx';

import { BasicsProps } from '@/components/type.ts';

import { EventEmitter } from '@/hooks/use-event-emitter.ts';

type ILive2DCoreProps = BasicsProps<'canvas'> &
  MotionProps & {
    event$?: EventEmitter<Live2DEvent>;
  };

const Live2DCore: React.FC<ILive2DCoreProps> = ({ event$, ...rest }) => {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let disposed = false;
    let initialized = false;
    let pixiApp: Application | null = null;
    let model: Live2DModel | null = null;

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
        model.destroy({ children: true, texture: true, textureSource: true });
        model = null;
      }

      if (pixiApp && initialized) {
        pixiApp.destroy({ removeView: false }, { children: true });
        pixiApp = null;
        initialized = false;
      }
    };

    const initialize = async () => {
      try {
        pixiApp = new Application();
        await pixiApp.init({
          canvas,
          resizeTo: canvas,
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
          {
            autoHitTest: false,
            autoFocus: false,
            ticker: pixiApp.ticker,
          },
        );

        if (disposed) {
          destroy();
          return;
        }

        model.scale.set(0.125);
        model.position.set(-70, 10);
        model.anchor.set(0, 0);

        pixiApp.stage.addChild(model);
        event$?.emit(Live2DEvent.INIT);
      } catch (error) {
        destroy();
        if (disposed) return;

        logger.warn('Live2D 初始化失败，保留静态形象', error);
        event$?.emit(Live2DEvent.FAILED);
      }
    };

    void initialize();

    return () => {
      disposed = true;
      canvas.removeEventListener('webglcontextlost', handleContextLost);
      canvas.removeEventListener('webglcontextrestored', handleContextRestored);
      destroy();
    };
  }, [event$]);

  return <motion.canvas ref={canvasRef} {...rest} />;
};

export default Live2DCore;
