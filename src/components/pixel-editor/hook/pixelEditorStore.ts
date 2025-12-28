import { EditorActions, EditorState } from "../_lib/validations";
import { create } from "zustand";
import { simpleBrushPaint } from "../helpers/pixelEditorUtils";

export const useEditorStore = create<EditorState & EditorActions>((set, get) => ({
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
  interactionMode: "select",
  isMiddleMouseDown: false,
  isRightMouseDown: false,
  zoomSpeed: 0.06,
  minScale: 0.01,
  maxScale: 100,
  snapToGrid: true,
  showGrid: true,
  showRuler: false,
  gridSize: 10,
  pixels: {},
  currentColor: "#000000",
  brushSize: { width: 1, height: 1 },

  // ==========================================
  // 像素操作
  // ==========================================
  
  // 更新 addPixel 和 removePixel 以使用相同的逻辑
addPixel: (targetX, targetY) => {
  const state = get();
  const worldPos = { x: targetX, y: targetY };
  
  const newPixels = simpleBrushPaint(
    worldPos,
    state.pixels,
    state.brushSize,
    state.currentColor,
    true,
    false
  );
  
  set({ pixels: newPixels });
},

removePixel: (targetX, targetY) => {
  const state = get();
  const worldPos = { x: targetX, y: targetY };
  
  const newPixels = simpleBrushPaint(
    worldPos,
    state.pixels,
    state.brushSize,
    state.currentColor,
    false,
    true
  );
  
  set({ pixels: newPixels });
},
  
  setCurrentColor: (color) => set({ currentColor: color }),
  setBrushSize: (width, height) => set({ brushSize: { width, height } }),
  
  // ==========================================
  // 视图操作
  // ==========================================
  
  setMapCenter: (center) => set({ mapCenter: center }),
  setScale: (scale) => set({ scale }),
  
  updateMapCenter: (deltaX, deltaY) => {
    const { mapCenter } = get();
    set({
      mapCenter: {
        x: mapCenter.x - deltaX,
        y: mapCenter.y - deltaY,
      },
    });
  },
  
  zoomToPoint: (point, factor) => {
    const { mapCenter, scale } = get();
    const newScale = Math.max(
      get().minScale,
      Math.min(get().maxScale, scale * factor)
    );
    
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
  
  resetView: () => set({
    mapCenter: { x: 0, y: 0 },
    scale: 1,
    mousePosition: null,
  }),
  
  // ==========================================
  // 鼠标状态
  // ==========================================
  
  setMousePosition: (position) => set({ mousePosition: position }),
  setIsDragging: (dragging) => set({ isDragging: dragging }),
  setDragStart: (start) => set({ dragStart: start }),
  setLastMousePosition: (position) => set({ lastMousePosition: position }),
  
  // ==========================================
  // 交互控制
  // ==========================================
  
  setInteractionMode: (mode) => set({ interactionMode: mode }),
  setIsMiddleMouseDown: (down) => set({ isMiddleMouseDown: down }),
  setIsRightMouseDown: (down) => set({ isRightMouseDown: down }),
  
  // ==========================================
  // 画布设置
  // ==========================================
  
  setCanvasSize: (width, height) => set({ canvasWidth: width, canvasHeight: height }),
  setSnapToGrid: (snap) => set({ snapToGrid: snap }),
  setShowGrid: (show) => set({ showGrid: show }),
  setShowRuler: (show) => set({ showRuler: show }),
  setGridSize: (size) => set({ gridSize: size }),
  
  // ==========================================
  // 像素设置
  // ==========================================
  
  setPixels: (pixels) => set({ pixels }),
}));