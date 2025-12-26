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
  const state = get();
  const { pixels, currentColor, brushSize } = state;
  
  // 计算笔刷覆盖区域（整数坐标）
  const startX = targetX - Math.floor(brushSize.width / 2);
  const startY = targetY - Math.floor(brushSize.height / 2);
  
  // 创建新像素块
  const key = `${startX},${startY}`;
  const newPixel: PixelBlock = {
    id: crypto.randomUUID(),
    x: startX,
    y: startY,
    width: brushSize.width,
    height: brushSize.height,
    color: currentColor,
    type: 1,
  };
  
  // 检查是否与现有像素块重叠
  const newPixels = { ...pixels };
  let hasOverlap = false;
  
  for (const existingKey in newPixels) {
    const existingPixel = newPixels[existingKey];
    
    // 检查矩形重叠
    if (startX < existingPixel.x + existingPixel.width &&
        startX + brushSize.width > existingPixel.x &&
        startY < existingPixel.y + existingPixel.height &&
        startY + brushSize.height > existingPixel.y) {
      
      // 完全覆盖相同区域且颜色相同，跳过
      if (existingPixel.x === startX && 
          existingPixel.y === startY && 
          existingPixel.width === brushSize.width && 
          existingPixel.height === brushSize.height &&
          existingPixel.color === currentColor) {
        return;
      }
      
      // 删除重叠的像素块
      delete newPixels[existingKey];
      hasOverlap = true;
    }
  }
  
  // 添加新像素块
  newPixels[key] = newPixel;
  set({ pixels: newPixels });
},

removePixel: (targetX, targetY) => {
  const state = get();
  const { pixels, brushSize } = state;
  
  const newPixels = { ...pixels };
  let hasChanges = false;
  
  // 计算擦除区域（整数坐标）
  const eraseStartX = targetX - Math.floor(brushSize.width / 2);
  const eraseStartY = targetY - Math.floor(brushSize.height / 2);
  const eraseEndX = eraseStartX + brushSize.width;
  const eraseEndY = eraseStartY + brushSize.height;
  
  // 遍历所有像素块，检查是否与擦除区域相交
  for (const key in newPixels) {
    const pixel = newPixels[key];
    const pixelEndX = pixel.x + pixel.width;
    const pixelEndY = pixel.y + pixel.height;
    
    // 检查矩形是否相交
    if (eraseStartX < pixelEndX &&
        eraseEndX > pixel.x &&
        eraseStartY < pixelEndY &&
        eraseEndY > pixel.y) {
      
      // 计算相交区域
      const intersectX1 = Math.max(eraseStartX, pixel.x);
      const intersectY1 = Math.max(eraseStartY, pixel.y);
      const intersectX2 = Math.min(eraseEndX, pixelEndX);
      const intersectY2 = Math.min(eraseEndY, pixelEndY);
      
      // 如果擦除区域完全覆盖像素块，删除整个像素块
      if (intersectX1 === pixel.x && intersectY1 === pixel.y &&
          intersectX2 === pixelEndX && intersectY2 === pixelEndY) {
        delete newPixels[key];
        hasChanges = true;
      }
      // 如果部分覆盖，可能需要分割像素块（复杂情况，暂时简单处理为删除）
      else {
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