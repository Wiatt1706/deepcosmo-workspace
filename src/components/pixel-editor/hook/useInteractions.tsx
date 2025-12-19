import { Position } from "../_lib/validations";
import { useCallback, useRef } from "react";
import { useEvent } from "../../GeneralEvent";
import { useEditorStore } from "./pixelEditorStore";

// 将画布坐标转换为世界坐标
const canvasToWorld = (
  canvasX: number,
  canvasY: number,
  mapCenter: Position,
  scale: number,
  pixelSize: number,
  canvasWidth: number,
  canvasHeight: number
): Position => {
  const centerX = canvasWidth / 2;
  const centerY = canvasHeight / 2;

  return {
    x: (canvasX - centerX) / (pixelSize * scale) + mapCenter.x,
    y: (canvasY - centerY) / (pixelSize * scale) + mapCenter.y,
  };
};

// 将世界坐标转换为画布坐标
const worldToCanvas = (
  worldX: number,
  worldY: number,
  mapCenter: Position,
  scale: number,
  pixelSize: number,
  canvasWidth: number,
  canvasHeight: number
): Position => {
  const centerX = canvasWidth / 2;
  const centerY = canvasHeight / 2;

  return {
    x: (worldX - mapCenter.x) * pixelSize * scale + centerX,
    y: (worldY - mapCenter.y) * pixelSize * scale + centerY,
  };
};

export const useInteractions = (containerRef: React.RefObject<HTMLDivElement>) => {
  const {
    mapCenter,
    scale,
    pixelSize,
    canvasWidth,
    canvasHeight,
    mousePosition,
    isDragging,
    dragStart,
    isMiddleMouseDown,
    isRightMouseDown,
    interactionMode,
    zoomSpeed,
    minScale,
    maxScale,
    snapToGrid,
    gridSize,
    panConstraints,
    setMousePosition,
    setIsDragging,
    setDragStart,
    setIsMiddleMouseDown,
    setIsRightMouseDown,
    updateMapCenter,
    zoomToPoint,
    setLastMousePosition,
  } = useEditorStore();

  const isDraggingRef = useRef<boolean>(false);
  const lastWheelTime = useRef<number>(0);
  const wheelTimeout = useRef<NodeJS.Timeout | null>(null);
  // 额外限制每次缩放的最大幅度，平滑滚轮体验
  const MAX_WHEEL_FACTOR = 1.08; // 单次最大放大 8%
  const MIN_WHEEL_FACTOR = 1 / MAX_WHEEL_FACTOR; // 单次最小缩小 8%

  // 获取鼠标在画布中的位置
  const getCanvasPosition = useCallback((e: MouseEvent): Position | null => {
    if (!containerRef.current) return null;

    const rect = containerRef.current.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }, [containerRef]);

  // 获取鼠标在世界坐标系中的位置
  const getWorldPosition = useCallback((e: MouseEvent): Position | null => {
    const canvasPos = getCanvasPosition(e);
    if (!canvasPos) return null;

    return canvasToWorld(
      canvasPos.x,
      canvasPos.y,
      mapCenter,
      scale,
      pixelSize,
      canvasWidth,
      canvasHeight
    );
  }, [getCanvasPosition, mapCenter, scale, pixelSize, canvasWidth, canvasHeight]);

  // 网格捕捉
  const snapToGridPosition = useCallback((worldPos: Position): Position => {
    if (!snapToGrid) return worldPos;

    return {
      x: Math.round(worldPos.x / gridSize) * gridSize,
      y: Math.round(worldPos.y / gridSize) * gridSize,
    };
  }, [snapToGrid, gridSize]);

  // 鼠标移动处理
  useEvent("mousemove", (e: MouseEvent) => {
    const canvasPos = getCanvasPosition(e);
    if (!canvasPos) return;

    setMousePosition(canvasPos);
    setLastMousePosition(canvasPos);

    // 处理拖拽
    if (!isDragging || !dragStart) return;

    const moveX = e.clientX - dragStart.x;
    const moveY = e.clientY - dragStart.y;

    // 检测是否真正开始拖拽（避免误触）
    if (!isDraggingRef.current) {
      const movedEnough = Math.abs(moveX) > 2 || Math.abs(moveY) > 2;
      if (movedEnough) {
        isDraggingRef.current = true;
      }
    }

    // 根据交互模式处理拖拽
    if (isDraggingRef.current) {
      if (interactionMode === 'pan' || isMiddleMouseDown) {
        // 平移模式
        const deltaX = moveX / scale;
        const deltaY = moveY / scale;
        updateMapCenter(deltaX, deltaY);
        setDragStart({ x: e.clientX, y: e.clientY });
      }
      // 其他交互模式可以在这里添加
    }
  });

  // 鼠标按下处理
  useEvent("mousedown", (e: MouseEvent) => {
    if (!containerRef.current) return;

    const canvasPos = getCanvasPosition(e);
    if (!canvasPos) return;

    // 根据鼠标按键设置不同的交互模式
    if (e.button === 1) { // 中键
      setIsMiddleMouseDown(true);
      setIsDragging(true);
      isDraggingRef.current = false;
      setDragStart({ x: e.clientX, y: e.clientY });
      e.preventDefault();
    } else if (e.button === 2) { // 右键
      setIsRightMouseDown(true);
      // 右键可以显示上下文菜单或设置选择模式
      e.preventDefault();
    } else if (e.button === 0) { // 左键
      setIsDragging(true);
      isDraggingRef.current = false;
      setDragStart({ x: e.clientX, y: e.clientY });
    }
  }, containerRef.current);

  // 鼠标释放处理
  useEvent("mouseup", (e: MouseEvent) => {
    if (isDragging) {
      if (!isDraggingRef.current) {
        // 处理点击事件（非拖拽）
        handleClick(e);
      }
      isDraggingRef.current = false;
      setIsDragging(false);
      setDragStart(null);
    }

    if (e.button === 1) { // 中键释放
      setIsMiddleMouseDown(false);
    } else if (e.button === 2) { // 右键释放
      setIsRightMouseDown(false);
    }
  });

  // 滚轮缩放处理
  useEvent("wheel", (e: WheelEvent) => {
    e.preventDefault();

    const now = Date.now();
    const timeSinceLastWheel = now - lastWheelTime.current;
    lastWheelTime.current = now;

    // 防抖处理，避免滚轮事件过于频繁
    if (wheelTimeout.current) {
      clearTimeout(wheelTimeout.current);
    }

    wheelTimeout.current = setTimeout(() => {
      const canvasPos = getCanvasPosition(e);
      if (!canvasPos) return;

      // 获取鼠标位置对应的世界坐标
      const worldPos = canvasToWorld(
        canvasPos.x,
        canvasPos.y,
        mapCenter,
        scale,
        pixelSize,
        canvasWidth,
        canvasHeight
      );

      // 计算缩放因子
      const delta = e.deltaY;
      // 基于 zoomSpeed 的基础因子
      let factor = Math.pow(1 + zoomSpeed, -Math.sign(delta));
      // 夹紧到更小的幅度，避免滚动过猛
      factor = Math.max(MIN_WHEEL_FACTOR, Math.min(MAX_WHEEL_FACTOR, factor));

      // 以鼠标位置为中心进行缩放
      zoomToPoint(worldPos, factor);
    }, 16); // 约60fps的更新频率
  }, containerRef.current);

  // 点击处理
  const handleClick = useCallback((e: MouseEvent) => {
    const canvasPos = getCanvasPosition(e);
    if (!canvasPos) return;

    const worldPos = canvasToWorld(
      canvasPos.x,
      canvasPos.y,
      mapCenter,
      scale,
      pixelSize,
      canvasWidth,
      canvasHeight
    );

    // 应用网格捕捉
    const snappedPos = snapToGridPosition(worldPos);

    // 根据交互模式处理点击
    switch (interactionMode) {
      case 'select':
        // 选择模式：选择对象或设置选择点
        console.log('选择点:', snappedPos);
        break;
      case 'draw':
        // 绘制模式：添加绘制点
        console.log('绘制点:', snappedPos);
        break;
      case 'pan':
        // 平移模式：不处理点击
        break;
    }
  }, [getCanvasPosition, mapCenter, scale, pixelSize, canvasWidth, canvasHeight, snapToGridPosition, interactionMode]);

  // 键盘快捷键处理
  useEvent("keydown", (e: KeyboardEvent) => {
    // 防止在输入框中触发快捷键
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
      return;
    }

    switch (e.key) {
      case ' ':
        // 空格键：临时切换到平移模式
        e.preventDefault();
        break;
      case 'Escape':
        // ESC键：取消当前操作
        e.preventDefault();
        break;
      case '+':
      case '=':
        // 放大
        e.preventDefault();
        if (mousePosition) {
          const worldPos = canvasToWorld(
            mousePosition.x,
            mousePosition.y,
            mapCenter,
            scale,
            pixelSize,
            canvasWidth,
            canvasHeight
          );
          zoomToPoint(worldPos, 1 + zoomSpeed);
        }
        break;
      case '-':
        // 缩小
        e.preventDefault();
        if (mousePosition) {
          const worldPos = canvasToWorld(
            mousePosition.x,
            mousePosition.y,
            mapCenter,
            scale,
            pixelSize,
            canvasWidth,
            canvasHeight
          );
          zoomToPoint(worldPos, 1 / (1 + zoomSpeed));
        }
        break;
      case '0':
        // 重置视图
        e.preventDefault();
        useEditorStore.getState().resetView();
        break;
    }
  });

  // 键盘释放处理
  useEvent("keyup", (e: KeyboardEvent) => {
    if (e.key === ' ') {
      // 释放空格键：恢复之前的交互模式
      e.preventDefault();
    }
  });

  return {
    getCanvasPosition,
    getWorldPosition,
    snapToGridPosition,
  };
};
