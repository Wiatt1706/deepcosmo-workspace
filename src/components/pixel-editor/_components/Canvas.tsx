"use client";

import { useCallback, useEffect, useRef } from "react";
import { useEditorStore } from "../hook/pixelEditorStore";
import { drawGrid, drawRuler } from "../helpers/BaseDraw";
import { useInteractions } from "../hook/useInteractions";
import { useCanvasSize } from "../hook/useCanvasBase";

const EditCanvas = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const buffRef = useRef<HTMLCanvasElement | null>(null);

  // 使用Zustand状态管理
  const {
    mapCenter,
    pixelSize,
    scale,
    mousePosition,
    showGrid,
    showRuler,
    setCanvasSize,
  } = useEditorStore();

  const initializeCanvasSize = useCanvasSize(containerRef, buffRef);

  // 交互系统
  useInteractions(containerRef as React.RefObject<HTMLDivElement>);

  const render = useCallback(() => {
    const buffCtx = buffRef.current?.getContext("2d");
    if (!buffCtx) return;
    buffCtx.clearRect(0, 0, buffCtx.canvas.width, buffCtx.canvas.height);
    const buffCanvas = buffRef.current;
    const dpr = window.devicePixelRatio;
    if (!buffCanvas) return;

    const canvasWidth = buffCtx.canvas.width / dpr;
    const canvasHeight = buffCtx.canvas.height / dpr;

    // 更新画布尺寸到状态管理
    setCanvasSize(canvasWidth, canvasHeight);

    // 根据设置显示网格和标尺
    if (showGrid) {
      drawGrid(
        buffCtx,
        mapCenter,
        scale,
        pixelSize,
        canvasWidth,
        canvasHeight,
      );
    }

    if (showRuler) {
      drawRuler(
        buffCtx,
        mapCenter,
        scale,
        pixelSize,
        canvasWidth,
        canvasHeight,
        mousePosition
      );
    }
  }, [
    scale,
    mapCenter,
    pixelSize,
    mousePosition,
    showGrid,
    showRuler,
    setCanvasSize,
  ]);

  useEffect(() => {
    const resizeObserver = new ResizeObserver(() => {
      initializeCanvasSize();
      render();
    });

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    initializeCanvasSize();
    render();

    return () => {
      resizeObserver.disconnect();
    };
  }, [initializeCanvasSize, render]);

  useEffect(() => {
    const animationFrameId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animationFrameId);
  }, [render]);

  return (
    <div
      className="h-full w-full overflow-hidden bg-[#f3f6f8] select-none"
      ref={containerRef}
      style={{
        cursor: 'crosshair', // CAD标准的十字光标
      }}
    >
      <canvas ref={buffRef} />
    </div>
  );
};

export default EditCanvas;
