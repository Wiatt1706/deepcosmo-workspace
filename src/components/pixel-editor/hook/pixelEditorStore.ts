import { PixelBlock, Position } from "../_lib/validations";
import { create } from "zustand";

interface BrushSize {
  width: number;
  height: number;
}

interface EditorState {
  // 画布状态
  mapCenter: Position;
  pixelSize: number;
  scale: number;
  // 鼠标状态
  mousePosition: Position | null;
  isDragging: boolean;
  dragStart: Position | null;
  lastMousePosition: Position | null;
  // 交互模式
  interactionMode: "pan" | "select" | "draw";
  isMiddleMouseDown: boolean;
  isRightMouseDown: boolean;
  // 缩放控制
  zoomSpeed: number;
  minScale: number;
  maxScale: number;
  // 平移约束
  panConstraints: {
    enabled: boolean;
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
  };
  // 画布尺寸
  canvasWidth: number;
  canvasHeight: number;
  // 实用功能设置
  snapToGrid: boolean;
  showGrid: boolean;
  showRuler: boolean;
  gridSize: number;

  // --- 新增: 像素数据 ---
  pixels: Record<string, PixelBlock>; // Key: "x,y"
  currentColor: string;
  brushSize: BrushSize;

  // --- 新增: Actions ---
  addPixel: (x: number, y: number) => void;
  removePixel: (x: number, y: number) => void;
  setCurrentColor: (color: string) => void;
  setBrushSize: (width: number, height: number) => void;
  // Actions
  setMapCenter: (center: Position) => void;
  setPixelSize: (size: number) => void;
  setScale: (scale: number) => void;
  setMousePosition: (position: Position | null) => void;
  setIsDragging: (dragging: boolean) => void;
  setDragStart: (start: Position | null) => void;
  setCanvasSize: (width: number, height: number) => void;
  setLastMousePosition: (position: Position | null) => void;
  // 交互控制
  setInteractionMode: (mode: "pan" | "select" | "draw") => void;
  setIsMiddleMouseDown: (down: boolean) => void;
  setIsRightMouseDown: (down: boolean) => void;
  // 缩放控制
  setZoomSpeed: (speed: number) => void;
  setMinScale: (scale: number) => void;
  setMaxScale: (scale: number) => void;
  // 平移约束控制
  setPanConstraints: (constraints: {
    enabled: boolean;
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
  }) => void;
  // 实用功能控制
  setSnapToGrid: (snap: boolean) => void;
  setShowGrid: (show: boolean) => void;
  setShowRuler: (show: boolean) => void;
  setGridSize: (size: number) => void;
  // 复合操作
  updateMapCenter: (deltaX: number, deltaY: number) => void;
  zoomToPoint: (point: Position, factor: number) => void;
  resetView: () => void;
  zoomToFit: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
}
export const useEditorStore = create<EditorState>((set, get) => ({
  // 初始状态
  mapCenter: { x: 0, y: 0 },
  pixelSize: 10,
  scale: 1,
  mousePosition: null,
  isDragging: false,
  dragStart: null,
  lastMousePosition: null,
  canvasWidth: 800,
  canvasHeight: 600,
  // 交互模式
  interactionMode: "select",
  isMiddleMouseDown: false,
  isRightMouseDown: false,
  // 缩放控制
  // 调低缩放速度，降低滚轮缩放的“力度”
  zoomSpeed: 0.06,
  minScale: 0.01,
  maxScale: 100,
  // 平移约束
  panConstraints: {
    enabled: false,
    minX: -1000,
    maxX: 1000,
    minY: -1000,
    maxY: 1000,
  },
  // 实用功能设置
  snapToGrid: true,
  showGrid: true,
  showRuler: true,
  gridSize: 10,
  // 新增初始状态
  pixels: {},
  currentColor: "#000000", // 默认黑色
  brushSize: { width: 1, height: 1 },

  // 新增 Actions 实现
  setCurrentColor: (color) => set({ currentColor: color }),
  setBrushSize: (width, height) => set({ brushSize: { width, height } }),
  addPixel: (targetX, targetY) => {
    const { pixels, currentColor, brushSize } = get();
    
    // 为了性能，先复制一份当前的像素数据
    const newPixels = { ...pixels };
    let hasChanges = false;

    // 计算中心偏移量，让鼠标位于笔刷中心
    // 如果是偶数(如2)，中心会偏左上，这是像素软件的通习
    const startX = targetX - Math.floor(brushSize.width / 2);
    const startY = targetY - Math.floor(brushSize.height / 2);

    // 双重循环遍历笔刷覆盖的区域
    for (let i = 0; i < brushSize.width; i++) {
      for (let j = 0; j < brushSize.height; j++) {
        const x = startX + i;
        const y = startY + j;
        const key = `${x},${y}`;

        // 检查颜色是否一致，避免重复渲染
        if (newPixels[key] && newPixels[key].color === currentColor) {
          continue;
        }

        // 写入新像素
        newPixels[key] = {
          id: crypto.randomUUID(), // 注意：如果绘制大量像素，UUID生成可能耗时，可改用简单计数器或坐标ID
          x,
          y,
          width: 1,
          height: 1,
          color: currentColor,
          type: 1,
        };
        hasChanges = true;
      }
    }

    // 只有当确实有像素改变时才触发更新
    if (hasChanges) {
      set({ pixels: newPixels });
    }
  },

  // --- 修改: 支持笔刷尺寸的 removePixel (橡皮擦也应该有大小) ---
  removePixel: (targetX, targetY) => {
    const { pixels, brushSize } = get();
    
    // 如果想要橡皮擦始终是 1x1，可以忽略 brushSize，
    // 但通常用户期望橡皮擦大小与笔刷一致或可独立设置。
    // 这里假设橡皮擦复用笔刷大小：
    
    const newPixels = { ...pixels };
    let hasChanges = false;

    const startX = targetX - Math.floor(brushSize.width / 2);
    const startY = targetY - Math.floor(brushSize.height / 2);

    for (let i = 0; i < brushSize.width; i++) {
      for (let j = 0; j < brushSize.height; j++) {
        const x = startX + i;
        const y = startY + j;
        const key = `${x},${y}`;

        if (newPixels[key]) {
          delete newPixels[key];
          hasChanges = true;
        }
      }
    }

    if (hasChanges) {
      set({ pixels: newPixels });
    }
  },
  // Actions
  setMapCenter: center => set({ mapCenter: center }),
  setPixelSize: size => set({ pixelSize: size }),
  setScale: scale => set({ scale }),
  setMousePosition: position => set({ mousePosition: position }),
  setIsDragging: dragging => set({ isDragging: dragging }),
  setDragStart: start => set({ dragStart: start }),
  setCanvasSize: (width, height) =>
    set({ canvasWidth: width, canvasHeight: height }),
  setLastMousePosition: position => set({ lastMousePosition: position }),
  // 交互控制
  setInteractionMode: mode => set({ interactionMode: mode }),
  setIsMiddleMouseDown: down => set({ isMiddleMouseDown: down }),
  setIsRightMouseDown: down => set({ isRightMouseDown: down }),
  // 缩放控制
  setZoomSpeed: speed => set({ zoomSpeed: speed }),
  setMinScale: scale => set({ minScale: scale }),
  setMaxScale: scale => set({ maxScale: scale }),
  // 平移约束控制
  setPanConstraints: constraints => set({ panConstraints: constraints }),
  // 实用功能控制
  setSnapToGrid: snap => set({ snapToGrid: snap }),
  setShowGrid: show => set({ showGrid: show }),
  setShowRuler: show => set({ showRuler: show }),
  setGridSize: size => set({ gridSize: size }),
  // 复合操作
  updateMapCenter: (deltaX, deltaY) => {
    const { mapCenter, panConstraints } = get();
    let newX = mapCenter.x - deltaX;
    let newY = mapCenter.y - deltaY;
    // 应用平移约束
    if (panConstraints.enabled) {
      newX = Math.max(panConstraints.minX, Math.min(panConstraints.maxX, newX));
      newY = Math.max(panConstraints.minY, Math.min(panConstraints.maxY, newY));
    }
    set({
      mapCenter: {
        x: newX,
        y: newY,
      },
    });
  },
  resetView: () =>
    set({
      mapCenter: { x: 0, y: 0 },
      scale: 1,
      mousePosition: null,
    }),
  zoomToFit: () => {
    const { canvasWidth, canvasHeight } = get();
    // 简单的适应画布逻辑
    const targetScale = Math.min(canvasWidth / 1000, canvasHeight / 1000);
    set({
      scale: Math.max(0.1, Math.min(10, targetScale)),
      mapCenter: { x: 0, y: 0 },
    });
  },
  zoomToPoint: (point, factor) => {
    const { mapCenter, scale } = get();
    const newScale = Math.max(
      get().minScale,
      Math.min(get().maxScale, scale * factor)
    );
    // 计算缩放后的新中心点，使指定点保持在屏幕上的相同位置
    const scaleRatio = newScale / scale;
    const newCenter = {
      x: point.x - (point.x - mapCenter.x) * scaleRatio,
      y: point.y - (point.y - mapCenter.y) * scaleRatio,
    };
    set({
      scale: newScale,
      mapCenter: newCenter,
    });
  },
  zoomIn: () => {
    const { scale, mousePosition } = get();
    const factor = 1 + get().zoomSpeed;
    if (mousePosition) {
      get().zoomToPoint(mousePosition, factor);
    } else {
      set({ scale: Math.min(get().maxScale, scale * factor) });
    }
  },
  zoomOut: () => {
    const { scale, mousePosition } = get();
    const factor = 1 / (1 + get().zoomSpeed);
    if (mousePosition) {
      get().zoomToPoint(mousePosition, factor);
    } else {
      set({ scale: Math.max(get().minScale, scale * factor) });
    }
  },
}));