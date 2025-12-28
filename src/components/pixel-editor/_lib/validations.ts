export interface Position {
  x: number;
  y: number;
}

export interface BrushSize {
  width: number;
  height: number;
}
// 像素块存储实体
export interface PixelBlock {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string | CanvasGradient | CanvasPattern;
  type: number;
  status?: number;
  landCoverImg?: string | null;
  groupId?: string;
  owner?: string;
}

export interface Photo {
  id: string;
  src: string;
  alt?: string;
  type?: string;
}

export interface EditorState {
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
  
  // 画布尺寸
  canvasWidth: number;
  canvasHeight: number;
  
  // 实用功能
  snapToGrid: boolean;
  showGrid: boolean;
  showRuler: boolean;
  gridSize: number;
  
  // 像素数据
  pixels: Record<string, PixelBlock>;
  currentColor: string;
  brushSize: BrushSize;
}

export interface EditorActions {
  // 像素操作
  addPixel: (x: number, y: number) => void;
  removePixel: (x: number, y: number) => void;
  setCurrentColor: (color: string) => void;
  setBrushSize: (width: number, height: number) => void;
  
  // 视图操作
  setMapCenter: (center: Position) => void;
  setScale: (scale: number) => void;
  updateMapCenter: (deltaX: number, deltaY: number) => void;
  zoomToPoint: (point: Position, factor: number) => void;
  resetView: () => void;
  
  // 鼠标状态
  setMousePosition: (position: Position | null) => void;
  setIsDragging: (dragging: boolean) => void;
  setDragStart: (start: Position | null) => void;
  setLastMousePosition: (position: Position | null) => void;
  
  // 交互控制
  setInteractionMode: (mode: "pan" | "select" | "draw") => void;
  setIsMiddleMouseDown: (down: boolean) => void;
  setIsRightMouseDown: (down: boolean) => void;
  
  // 画布设置
  setCanvasSize: (width: number, height: number) => void;
  setSnapToGrid: (snap: boolean) => void;
  setShowGrid: (show: boolean) => void;
  setShowRuler: (show: boolean) => void;
  setGridSize: (size: number) => void;
  
  setPixels: (pixels: Record<string, PixelBlock>) => void;
}
