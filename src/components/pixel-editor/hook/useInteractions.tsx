import { Position } from "../_lib/validations";
import { useCallback, useRef } from "react";
import { useEvent } from "../../GeneralEvent";
import { useEditorStore } from "./pixelEditorStore";
import { useShallow } from "zustand/react/shallow"; // 建议引入 useShallow

// ==========================================
// 纯函数辅助工具
// ==========================================

// 1. 坐标转换 (保持不变)
const canvasToWorld = (
  canvasX: number,
  canvasY: number,
  mapCenter: Position,
  scale: number,
  pixelSize: number,
  canvasWidth: number,
  canvasHeight: number
): Position => {
  const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
  const halfWidth = (canvasWidth / 2) * dpr;
  const halfHeight = (canvasHeight / 2) * dpr;
  const physicalX = canvasX * dpr;
  const physicalY = canvasY * dpr;
  
  const worldX = (physicalX - halfWidth + mapCenter.x * dpr * scale) / (pixelSize * dpr * scale);
  const worldY = (physicalY - halfHeight + mapCenter.y * dpr * scale) / (pixelSize * dpr * scale);
  
  return { x: worldX, y: worldY };
};

// 2. Bresenham 算法：计算两点间的所有整数坐标 (用于快速拖拽时的补间)
const bresenhamLine = (x0: number, y0: number, x1: number, y1: number) => {
  const points: { x: number; y: number }[] = [];
  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;

  while (true) {
    points.push({ x: x0, y: y0 });
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 > -dy) { err -= dy; x0 += sx; }
    if (e2 < dx) { err += dx; y0 += sy; }
  }
  return points;
};

// ==========================================
// Hook 实现
// ==========================================
export const useInteractions = (containerRef: React.RefObject<HTMLDivElement>) => {
  // 1. 性能优化：使用 useShallow 提取 Actions，防止 Store 其他状态变化导致组件重渲染
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
      resetView: state.resetView,
      addPixel: state.addPixel,
      removePixel: state.removePixel,
    }))
  );

  // 2. Local Refs
  const isDraggingRef = useRef<boolean>(false);
  const dragStartPosRef = useRef<Position | null>(null); 
  const rafRef = useRef<number | null>(null); 
  
  // 优化：记录上一次绘制的“网格坐标”，用于插值计算
  const lastDrawnGridPosRef = useRef<{ x: number; y: number } | null>(null);

  const getState = useEditorStore.getState; // 直接获取 getter，不订阅

  // 获取 Canvas 坐标
  const getCanvasPosition = useCallback((e: MouseEvent): Position | null => {
    if (!containerRef.current) return null;
    const rect = containerRef.current.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }, [containerRef]);

  // 获取世界坐标
  const getWorldPosition = useCallback((e: MouseEvent): Position | null => {
    const canvasPos = getCanvasPosition(e);
    if (!canvasPos) return null;
    const { mapCenter, scale, pixelSize, canvasWidth, canvasHeight } = getState();
    return canvasToWorld(canvasPos.x, canvasPos.y, mapCenter, scale, pixelSize, canvasWidth, canvasHeight);
  }, [getCanvasPosition]);

  // 网格捕捉
  const snapToGridPosition = useCallback((worldPos: Position): Position => {
    const { snapToGrid, gridSize } = getState();
    if (!snapToGrid) return worldPos;
    return {
      x: Math.round(worldPos.x / gridSize) * gridSize,
      y: Math.round(worldPos.y / gridSize) * gridSize,
    };
  }, []);

  // === 核心绘制逻辑 (含插值优化) ===
  const performPaint = useCallback((worldPos: Position, buttons: number) => {
    const gridX = Math.round(worldPos.x);
    const gridY = Math.round(worldPos.y);

    const isLeftClick = (buttons & 1) === 1; // Bitwise check usually safer
    const isRightClick = (buttons & 2) === 2;

    // 如果没有上一次的位置（刚开始点击），直接画一个点
    if (!lastDrawnGridPosRef.current) {
        if (isLeftClick) actions.addPixel(gridX, gridY);
        else if (isRightClick) actions.removePixel(gridX, gridY);
        lastDrawnGridPosRef.current = { x: gridX, y: gridY };
        return;
    }

    // 计算当前点与上一个点的距离，如果距离大于 0 (不在同一个格子上)，则进行插值
    const lastX = lastDrawnGridPosRef.current.x;
    const lastY = lastDrawnGridPosRef.current.y;

    if (lastX !== gridX || lastY !== gridY) {
      // 获取路径上所有的点
      const points = bresenhamLine(lastX, lastY, gridX, gridY);
      
      // 批量处理 (Store 最好支持 batchAddPixel 以减少 notify，如果没有，循环调用也可以)
      points.forEach(p => {
         if (isLeftClick) actions.addPixel(p.x, p.y);
         else if (isRightClick) actions.removePixel(p.x, p.y);
      });

      lastDrawnGridPosRef.current = { x: gridX, y: gridY };
    }
  }, [actions]);

  // ==========================================
  // 事件处理逻辑
  // ==========================================

  // 1. Mousemove
  useEvent("mousemove", (e: MouseEvent) => {
    const canvasPos = getCanvasPosition(e);
    if (!canvasPos) return;

    actions.setMousePosition(canvasPos);
    actions.setLastMousePosition(canvasPos);

    const { isDragging, interactionMode, isMiddleMouseDown, scale, mapCenter, pixelSize, canvasWidth, canvasHeight } = getState();

    if (isDragging && dragStartPosRef.current) {
      const moveX = e.clientX - dragStartPosRef.current.x;
      const moveY = e.clientY - dragStartPosRef.current.y;

      // 拖拽阈值判断 (防抖)
      if (!isDraggingRef.current) {
        if (Math.abs(moveX) > 2 || Math.abs(moveY) > 2) isDraggingRef.current = true;
      }

      if (isDraggingRef.current) {
        // --- Pan 模式 ---
        if (interactionMode === 'pan' || isMiddleMouseDown) {
          if (rafRef.current) return;
          rafRef.current = requestAnimationFrame(() => {
            actions.updateMapCenter(moveX / scale, moveY / scale);
            dragStartPosRef.current = { x: e.clientX, y: e.clientY }; // Reset start to accumulate delta
            actions.setDragStart({ x: e.clientX, y: e.clientY });
            rafRef.current = null;
          });
        } 
        // --- Draw 模式 (优化版) ---
        else if (interactionMode === 'draw') {
           const worldPos = canvasToWorld(canvasPos.x, canvasPos.y, mapCenter, scale, pixelSize, canvasWidth, canvasHeight);
           performPaint(worldPos, e.buttons);
        }
      }
    }
  });

  // 2. Mousedown
  useEvent("mousedown", (e: MouseEvent) => {
    if (!containerRef.current) return;
    const canvasPos = getCanvasPosition(e);
    if (!canvasPos) return;

    const startPos = { x: e.clientX, y: e.clientY };
    dragStartPosRef.current = startPos;
    isDraggingRef.current = false;
    
    // 重置插值起点
    lastDrawnGridPosRef.current = null; 

    const { interactionMode, mapCenter, scale, pixelSize, canvasWidth, canvasHeight } = getState();

    // 中键平移
    if (e.button === 1) {
      e.preventDefault();
      actions.setIsMiddleMouseDown(true);
      actions.setIsDragging(true);
      actions.setDragStart(startPos);
    }
    // 右键
    else if (e.button === 2) {
      if (interactionMode === 'draw') {
        // 右键在 Draw 模式下是橡皮擦，属于 Drag 行为
        actions.setIsDragging(true);
        actions.setDragStart(startPos);
        
        const worldPos = canvasToWorld(canvasPos.x, canvasPos.y, mapCenter, scale, pixelSize, canvasWidth, canvasHeight);
        // 这里模拟 buttons = 2 (右键按下)
        performPaint(worldPos, 2); 
      } else {
        actions.setIsRightMouseDown(true);
      }
    }
    // 左键
    else if (e.button === 0) {
      actions.setIsDragging(true);
      actions.setDragStart(startPos);

      if (interactionMode === 'draw') {
        const worldPos = canvasToWorld(canvasPos.x, canvasPos.y, mapCenter, scale, pixelSize, canvasWidth, canvasHeight);
        // 这里模拟 buttons = 1 (左键按下)
        performPaint(worldPos, 1);
      }
    }
  }, containerRef.current);

  // 3. Mouseup
  useEvent("mouseup", (e: MouseEvent) => {
    const { isDragging, interactionMode } = getState();

    if (isDragging) {
      // 仅在非 draw 模式且没有发生实际拖拽位移时，视为 Click
      if (!isDraggingRef.current && interactionMode !== 'draw') {
        // Handle Click (Select logic, etc.)
        const canvasPos = getCanvasPosition(e);
        if (canvasPos) {
           const { mapCenter, scale, pixelSize, canvasWidth, canvasHeight } = getState();
           const worldPos = canvasToWorld(canvasPos.x, canvasPos.y, mapCenter, scale, pixelSize, canvasWidth, canvasHeight);
           const snapped = snapToGridPosition(worldPos);
           console.log("Clicked:", snapped); // Replace with select logic
        }
      }
      
      // Cleanup
      isDraggingRef.current = false;
      dragStartPosRef.current = null;
      lastDrawnGridPosRef.current = null;
      actions.setIsDragging(false);
      actions.setDragStart(null);
    }

    if (e.button === 1) actions.setIsMiddleMouseDown(false);
    if (e.button === 2) actions.setIsRightMouseDown(false);
  });

  // 4. Context Menu (关键：在 Draw 模式下必须禁用，否则右键擦除会弹出菜单)
  useEvent("contextmenu", (e: MouseEvent) => {
    const { interactionMode } = getState();
    if (interactionMode === 'draw') {
        e.preventDefault();
    }
  }, containerRef.current);

  // 5. Wheel (保持原有节流逻辑，稍作清理)
  useEvent("wheel", (e: WheelEvent) => {
    // 只有当鼠标在容器内时才阻止默认滚动，防止干扰页面其他部分滚动（视需求而定）
    // 如果全屏编辑器，则 e.preventDefault() 没问题
    if (!containerRef.current?.contains(e.target as Node)) return;
    
    e.preventDefault();
    if (rafRef.current) return;

    rafRef.current = requestAnimationFrame(() => {
      const canvasPos = getCanvasPosition(e);
      if (!canvasPos) { rafRef.current = null; return; }

      const { mapCenter, scale, pixelSize, canvasWidth, canvasHeight, zoomSpeed } = getState();
      const worldPos = canvasToWorld(canvasPos.x, canvasPos.y, mapCenter, scale, pixelSize, canvasWidth, canvasHeight);
      
      const delta = e.deltaY;
      const MAX_FACTOR = 1.15; 
      let factor = Math.pow(1 + zoomSpeed, -Math.sign(delta));
      factor = Math.max(1/MAX_FACTOR, Math.min(MAX_FACTOR, factor));
      
      actions.zoomToPoint(worldPos, factor);
      rafRef.current = null;
    });
  }, containerRef.current);

  // 6. Keyboard (无需大改，确保依赖引用正确)
  useEvent("keydown", (e: KeyboardEvent) => {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
    
    // ... 键盘逻辑保持不变，确保使用 getState() 获取最新值 ...
    // Example:
    const { zoomSpeed, canvasWidth, canvasHeight, mapCenter, scale, pixelSize } = getState();
    // ...
  });

  return {
    getCanvasPosition,
    getWorldPosition,
    snapToGridPosition,
  };
};