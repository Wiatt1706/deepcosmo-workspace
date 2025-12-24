"use client";
import { useCallback, useEffect, useRef } from "react";
import { useEditorStore } from "../hook/pixelEditorStore";
import { useInteractions } from "../hook/useInteractions";
import { useCanvasSize } from "../hook/useCanvasBase";
import { drawGrid } from "../helpers/DrawGrid";
import { drawRuler } from "../helpers/DrawRuler";
import { drawPixels } from "../helpers/DrawPixels";
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
    pixels,
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

    // 1. 绘制网格 (背景)
    if (showGrid) {
      drawGrid(
        buffCtx,
        mapCenter,
        scale,
        pixelSize,
        canvasWidth,
        canvasHeight,
        {
          width: 64, // 边界宽度，单位为基础步长 pixelSize
          height: 64 // 边界高度，单位为基础步长 pixelSize
        }
      );
    }

    // 2. 绘制像素 (中间层)
    drawPixels(
      buffCtx,
      pixels,
      mapCenter,
      scale,
      pixelSize,
      canvasWidth,
      canvasHeight
    );

    // 3. 绘制标尺 / UI (顶层)
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
    pixels,
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
    let animationFrameId: number;
    const loop = () => {
        render();
        animationFrameId = requestAnimationFrame(loop);
    };
    loop();
    return () => cancelAnimationFrame(animationFrameId);
  }, [render]);

  return (
    <div
      className="h-full w-full overflow-hidden bg-[#f3f6f8] select-none"
      ref={containerRef}
      style={{
        cursor: 'crosshair',
      }}
    >
      <canvas ref={buffRef} />
    </div>
  );
};
export default EditCanvas;