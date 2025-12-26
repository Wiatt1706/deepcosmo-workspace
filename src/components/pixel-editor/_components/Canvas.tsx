"use client";
import { useCallback, useEffect, useRef } from "react";
import { useEditorStore } from "../hook/pixelEditorStore";
import { useInteractions } from "../hook/useInteractions";
import { useCanvasSize } from "../hook/useCanvasBase";
import { drawGrid } from "../helpers/DrawGrid";
import { drawRuler } from "../helpers/DrawRuler";
import { drawPixels } from "../helpers/DrawPixels";
// 引入新写的 helper
import { drawGhostBrush } from "../helpers/DrawGhostBrush"; 

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
    // --- 新增获取 ---
    brushSize,    // 记得在 Store 中添加这个
    currentColor, // 记得在 Store 中添加这个
  } = useEditorStore();

  const initializeCanvasSize = useCanvasSize(containerRef, buffRef);

  // 交互系统
  useInteractions(containerRef as React.RefObject<HTMLDivElement>);

  const render = useCallback(() => {
    const buffCtx = buffRef.current?.getContext("2d");
    if (!buffCtx) return;

    // 清空画布
    buffCtx.clearRect(0, 0, buffCtx.canvas.width, buffCtx.canvas.height);
    
    const dpr = window.devicePixelRatio || 1;
    // 获取逻辑尺寸 (CSS Pixels)
    const canvasWidth = buffCtx.canvas.width / dpr;
    const canvasHeight = buffCtx.canvas.height / dpr;

    // 注意：不要在这里调用 setCanvasSize，会导致 React 更新循环或性能损耗
    // setCanvasSize 应该只在 ResizeObserver 中调用

    // 1. 绘制网格 (背景)
    if (showGrid) {
      drawGrid(buffCtx, mapCenter, scale, pixelSize, canvasWidth, canvasHeight, {
        width: 64,
        height: 64
      });
    }

    // 2. 绘制已有的像素 (中间层)
    drawPixels(buffCtx, pixels, mapCenter, scale, pixelSize, canvasWidth, canvasHeight);

    // 3. 绘制光标预览 (Ghost Brush) - [NEW]
    // 放在像素之后，标尺之前
    if (mousePosition) {
       drawGhostBrush(
         buffCtx,
         mousePosition,
         mapCenter,
         scale,
         pixelSize,
         canvasWidth,
         canvasHeight,
         brushSize,
         currentColor
       );
    }

    // 4. 绘制标尺 / UI (顶层)
    if (showRuler) {
      drawRuler(buffCtx, mapCenter, scale, pixelSize, canvasWidth, canvasHeight, mousePosition);
    }
  }, [
    scale,
    mapCenter,
    pixelSize,
    mousePosition,
    showGrid,
    showRuler,
    pixels,
    brushSize,    // Add dependency
    currentColor, // Add dependency
    // setCanvasSize removed from dependency because we don't call it here
  ]);

  // 处理 Resize
  useEffect(() => {
    const resizeObserver = new ResizeObserver(() => {
      initializeCanvasSize();
      
      // --- 优化：在这里更新 Store 的尺寸 ---
      if (buffRef.current) {
         const dpr = window.devicePixelRatio || 1;
         setCanvasSize(
            buffRef.current.width / dpr, 
            buffRef.current.height / dpr
         );
      }
      
      render(); // 尺寸变了立刻重绘一次
    });
    
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }
    
    // 初始化调用一次
    initializeCanvasSize();
    if (buffRef.current) {
       const dpr = window.devicePixelRatio || 1;
       setCanvasSize(buffRef.current.width / dpr, buffRef.current.height / dpr);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, [initializeCanvasSize, render, setCanvasSize]);

  // 动画循环
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
    >
      <canvas ref={buffRef} />
    </div>
  );
};

export default EditCanvas;