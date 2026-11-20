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

type Bounds = { x: number; y: number; width: number; height: number };

// 头部约占模型内容的上方区域，取这一区域做特写构图，身体在底部裁切。
const HEAD_REGION_RATIO = 0.4;
const HEAD_SIDE_PADDING = 0.06;
const HEAD_TOP_PADDING = 0.09;
const HEAD_MAX_BOTTOM = 0.94;

const unionBounds = (list: Bounds[]): Bounds => {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const bounds of list) {
    if (bounds.x < minX) minX = bounds.x;
    if (bounds.y < minY) minY = bounds.y;
    if (bounds.x + bounds.width > maxX) maxX = bounds.x + bounds.width;
    if (bounds.y + bounds.height > maxY) maxY = bounds.y + bounds.height;
  }

  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
};

// 读取当前姿态下所有可见 drawable 的顶点范围，换算成模型本地像素坐标。
const measureBounds = (target: Live2DModel): { content: Bounds; head: Bounds } => {
  const internal = target.internalModel as unknown as {
    pixelsPerUnit: number;
    originalWidth: number;
    originalHeight: number;
    coreModel: {
      getDrawableCount: () => number;
      getDrawableOpacity: (index: number) => number;
      getDrawableVertexPositions: (index: number) => Float32Array;
    };
  };
  const { pixelsPerUnit, originalWidth, originalHeight, coreModel } = internal;
  const drawables: Bounds[] = [];

  for (let index = 0; index < coreModel.getDrawableCount(); index += 1) {
    if (coreModel.getDrawableOpacity(index) <= 0.01) continue;

    const vertices = coreModel.getDrawableVertexPositions(index);
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (let vertex = 0; vertex < vertices.length; vertex += 2) {
      const x = vertices[vertex] * pixelsPerUnit + originalWidth / 2;
      const y = -vertices[vertex + 1] * pixelsPerUnit + originalHeight / 2;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }

    if (minX < maxX && minY < maxY) {
      drawables.push({ x: minX, y: minY, width: maxX - minX, height: maxY - minY });
    }
  }

  const content = unionBounds(drawables);
  const headLimit = content.y + content.height * HEAD_REGION_RATIO;
  const headParts = drawables.filter((drawable) => drawable.y + drawable.height / 2 <= headLimit);

  return { content, head: headParts.length > 0 ? unionBounds(headParts) : content };
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
    let initialization: Promise<void> | null = null;
    let headBounds: Bounds | null = null;

    // 按头部区域等比缩放：头部完整留在框内并水平居中，身体在底部自然裁切。
    const applyModelLayout = (width: number, height: number) => {
      if (!model) return;
      headBounds ??= measureBounds(model).head;

      const { x, y, width: headWidth, height: headHeight } = headBounds;
      const scale = Math.min(
        (width * (1 - 2 * HEAD_SIDE_PADDING)) / headWidth,
        (height * (HEAD_MAX_BOTTOM - HEAD_TOP_PADDING)) / headHeight,
      );

      model.scale.set(scale);
      model.position.set(
        width / 2 - (x + headWidth / 2) * scale,
        height * HEAD_TOP_PADDING - y * scale,
      );
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
