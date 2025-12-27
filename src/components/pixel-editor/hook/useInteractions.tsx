import { useCallback, useRef } from "react";
import { useEvent } from "../../GeneralEvent";
import { useEditorStore } from "./pixelEditorStore";
import { useShallow } from "zustand/react/shallow";
import { 
  canvasToWorld, 
  brushPaint, 
  brushPaintDrag,
  simpleBrushPaint 
} from "../helpers/pixelEditorUtils";

export const useInteractions = (containerRef: React.RefObject<HTMLDivElement>) => {
  const actions = useEditorStore(
    useShallow((state) => ({
      setMousePosition: state.setMousePosition,
      setIsDragging: state.setIsDragging,
      setDragStart: state.setDragStart,
      setIsMiddleMouseDown: state.setIsMiddleMouseDown,
      setIsRightMouseDown: state.setIsRightMouseDown,
      updateMapCenter: state.updateMapCenter,
      zoomToPoint: state.zoomToPoint,
      setLastMousePosition: state.setLastMousePosition,
      addPixel: state.addPixel,
      removePixel: state.removePixel,
      // 新增：用于直接更新像素数组
      setPixels: state.setPixels,
    }))
  );

  const getState = useEditorStore.getState;
  const isDraggingRef = useRef<boolean>(false);
  const dragStartPosRef = useRef<{ x: number; y: number } | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastPaintPosRef = useRef<{ x: number; y: number } | null>(null);

  // ==========================================
  // 坐标计算
  // ==========================================

  const getCanvasPosition = useCallback((e: MouseEvent) => {
    if (!containerRef.current) return null;
    const rect = containerRef.current.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }, [containerRef]);

  const getWorldPosition = useCallback((e: MouseEvent) => {
    const canvasPos = getCanvasPosition(e);
    if (!canvasPos) return null;
    const { mapCenter, scale, pixelSize, canvasWidth, canvasHeight } = getState();
    return canvasToWorld(
      canvasPos.x,
      canvasPos.y,
      mapCenter,
      scale,
      pixelSize,
      canvasWidth,
      canvasHeight
    );
  }, [getCanvasPosition]);

  // ==========================================
  // 绘制逻辑
  // ==========================================

  // 单击绘制
  const handleClickPaint = useCallback((e: MouseEvent, worldPos: { x: number; y: number }) => {
    const state = getState();
    const isLeftClick = e.button === 0;
    const isRightClick = e.button === 2;
    
    if (isLeftClick) {
      actions.addPixel(Math.floor(worldPos.x), Math.floor(worldPos.y));
    } else if (isRightClick) {
      // 右键单击：删除精确点击位置的像素
      const { pixels } = state;
      const clickedPixels = Object.values(pixels).filter(pixel => {
        return worldPos.x >= pixel.x && 
               worldPos.x < pixel.x + pixel.width &&
               worldPos.y >= pixel.y && 
               worldPos.y < pixel.y + pixel.height;
      });
      
      if (clickedPixels.length > 0) {
        const newPixels = { ...pixels };
        clickedPixels.forEach(pixel => {
          const key = `${pixel.x},${pixel.y}`;
          delete newPixels[key];
        });
        actions.setPixels(newPixels);
      }
    }
  }, [actions]);

  // 拖拽绘制（使用精确碰撞检测）
  const handleDragPaint = useCallback((worldPos: { x: number; y: number }, buttons: number) => {
    const state = getState();
    const isLeftClick = (buttons & 1) === 1;
    const isRightClick = (buttons & 2) === 2;
    
    if (!isLeftClick && !isRightClick) return;
    
    // 使用精确碰撞检测的拖拽绘制
    const { pixels, brushSize, currentColor } = state;
    const newPixels = simpleBrushPaint(
      worldPos,
      pixels,
      brushSize,
      currentColor,
      isLeftClick,
      isRightClick
    );
    
    actions.setPixels(newPixels);
  }, [actions]);

  // ==========================================
  // 事件处理器
  // ==========================================

  const handleMouseMove = useCallback((e: MouseEvent) => {
    const canvasPos = getCanvasPosition(e);
    if (!canvasPos) return;

    actions.setMousePosition(canvasPos);
    actions.setLastMousePosition(canvasPos);

    const { isDragging, interactionMode, isMiddleMouseDown } = getState();
    
    if (isDragging && dragStartPosRef.current) {
      const moveX = e.clientX - dragStartPosRef.current.x;
      const moveY = e.clientY - dragStartPosRef.current.y;

      if (!isDraggingRef.current && (Math.abs(moveX) > 2 || Math.abs(moveY) > 2)) {
        isDraggingRef.current = true;
      }

      if (isDraggingRef.current) {
        if (interactionMode === 'pan' || isMiddleMouseDown) {
          if (rafRef.current) return;
          rafRef.current = requestAnimationFrame(() => {
            actions.updateMapCenter(moveX / getState().scale, moveY / getState().scale);
            dragStartPosRef.current = { x: e.clientX, y: e.clientY };
            actions.setDragStart({ x: e.clientX, y: e.clientY });
            rafRef.current = null;
          });
        } else if (interactionMode === 'draw') {
          // 获取世界坐标
          const { mapCenter, scale, pixelSize, canvasWidth, canvasHeight } = getState();
          const worldPos = canvasToWorld(
            canvasPos.x,
            canvasPos.y,
            mapCenter,
            scale,
            pixelSize,
            canvasWidth,
            canvasHeight
          );
          
          // 使用新的拖拽绘制函数
          handleDragPaint(worldPos, e.buttons);
        }
      }
    }
  }, [getCanvasPosition, actions, handleDragPaint]);

  const handleMouseDown = useCallback((e: MouseEvent) => {
    if (!containerRef.current) return;
    const canvasPos = getCanvasPosition(e);
    if (!canvasPos) return;

    const startPos = { x: e.clientX, y: e.clientY };
    dragStartPosRef.current = startPos;
    isDraggingRef.current = false;
    lastPaintPosRef.current = null;

    const { interactionMode, mapCenter, scale, pixelSize, canvasWidth, canvasHeight } = getState();

    switch (e.button) {
      case 1: // 中键
        e.preventDefault();
        actions.setIsMiddleMouseDown(true);
        actions.setIsDragging(true);
        actions.setDragStart(startPos);
        break;
      case 2: // 右键
        if (interactionMode === 'draw') {
          actions.setIsDragging(true);
          actions.setDragStart(startPos);
          
          // 右键单击：删除像素
          const worldPos = canvasToWorld(
            canvasPos.x,
            canvasPos.y,
            mapCenter,
            scale,
            pixelSize,
            canvasWidth,
            canvasHeight
          );
          handleClickPaint(e, worldPos);
        } else {
          actions.setIsRightMouseDown(true);
        }
        break;
      case 0: // 左键
        actions.setIsDragging(true);
        actions.setDragStart(startPos);

        if (interactionMode === 'draw') {
          // 左键单击：添加像素
          const worldPos = canvasToWorld(
            canvasPos.x,
            canvasPos.y,
            mapCenter,
            scale,
            pixelSize,
            canvasWidth,
            canvasHeight
          );
          handleClickPaint(e, worldPos);
        }
        break;
    }
  }, [containerRef, getCanvasPosition, actions, handleClickPaint]);

  const handleMouseUp = useCallback((e: MouseEvent) => {
    const { isDragging } = getState();
    if (isDragging) {
      isDraggingRef.current = false;
      dragStartPosRef.current = null;
      lastPaintPosRef.current = null;
      actions.setIsDragging(false);
      actions.setDragStart(null);
    }

    if (e.button === 1) actions.setIsMiddleMouseDown(false);
    if (e.button === 2) actions.setIsRightMouseDown(false);
  }, [actions]);

  const handleWheel = useCallback((e: WheelEvent) => {
    if (!containerRef.current?.contains(e.target as Node)) return;
    e.preventDefault();
    
    if (rafRef.current) return;
    rafRef.current = requestAnimationFrame(() => {
      const canvasPos = getCanvasPosition(e);
      if (!canvasPos) {
        rafRef.current = null;
        return;
      }

      const { mapCenter, scale, pixelSize, canvasWidth, canvasHeight, zoomSpeed } = getState();
      const worldPos = canvasToWorld(
        canvasPos.x,
        canvasPos.y,
        mapCenter,
        scale,
        pixelSize,
        canvasWidth,
        canvasHeight
      );
      
      const delta = e.deltaY;
      const MAX_FACTOR = 1.15;
      let factor = Math.pow(1 + zoomSpeed, -Math.sign(delta));
      factor = Math.max(1 / MAX_FACTOR, Math.min(MAX_FACTOR, factor));
      
      actions.zoomToPoint(worldPos, factor);
      rafRef.current = null;
    });
  }, [containerRef, getCanvasPosition, actions]);

  const handleContextMenu = useCallback((e: MouseEvent) => {
    const { interactionMode } = getState();
    if (interactionMode === 'draw') {
      e.preventDefault();
    }
  }, []);

  // ==========================================
  // 事件绑定
  // ==========================================

  useEvent("mousemove", handleMouseMove);
  useEvent("mousedown", handleMouseDown, containerRef.current);
  useEvent("mouseup", handleMouseUp);
  useEvent("contextmenu", handleContextMenu, containerRef.current);
  useEvent("wheel", handleWheel, containerRef.current);

  return {
    getCanvasPosition,
    getWorldPosition,
  };
};