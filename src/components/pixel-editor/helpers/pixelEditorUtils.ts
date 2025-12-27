import { BrushSize, PixelBlock, Position } from "../_lib/validations";

// ==========================================
// 几何计算工具
// ==========================================

export const pointInRect = (
  point: Position,
  rect: { x: number; y: number; width: number; height: number }
): boolean => {
  return (
    point.x >= rect.x &&
    point.x < rect.x + rect.width &&
    point.y >= rect.y &&
    point.y < rect.y + rect.height
  );
};

export const getPixelAtPosition = (
  worldPos: Position,
  pixels: Record<string, PixelBlock>
): PixelBlock | null => {
  for (const key in pixels) {
    const pixel = pixels[key];
    if (pointInRect(worldPos, pixel)) {
      return pixel;
    }
  }
  return null;
};

export const getPixelsAtPosition = (
  worldPos: Position,
  pixels: Record<string, PixelBlock>
): PixelBlock[] => {
  const result: PixelBlock[] = [];
  for (const key in pixels) {
    const pixel = pixels[key];
    if (pointInRect(worldPos, pixel)) {
      result.push(pixel);
    }
  }
  return result;
};

export const canvasToWorld = (
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

export const bresenhamLine = (x0: number, y0: number, x1: number, y1: number) => {
  const points: Position[] = [];
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
// 像素操作工具
// ==========================================

export interface BrushPaintOptions {
  pixels: Record<string, PixelBlock>;
  brushSize: { width: number; height: number };
  currentColor: string;
  isLeftClick: boolean;
  isRightClick: boolean;
  worldPos: Position;
  isClick?: boolean;
}

export const brushPaint = (options: BrushPaintOptions): Record<string, PixelBlock> => {
  const { pixels, brushSize, currentColor, isLeftClick, isRightClick, worldPos, isClick = false } = options;
  const gridX = Math.floor(worldPos.x);
  const gridY = Math.floor(worldPos.y);
  
  const newPixels = { ...pixels };
  const startX = gridX - Math.floor(brushSize.width / 2);
  const startY = gridY - Math.floor(brushSize.height / 2);
  
  // 右键点击：精确删除
  if (isClick && isRightClick) {
    const clickedPixels = getPixelsAtPosition(worldPos, pixels);
    clickedPixels.forEach(pixel => {
      const key = `${pixel.x},${pixel.y}`;
      delete newPixels[key];
    });
    return newPixels;
  }
  
  // 左键点击：精确添加或替换
  if (isClick && isLeftClick) {
    const existingPixel = getPixelAtPosition(worldPos, pixels);
    if (!existingPixel) {
      const key = `${gridX},${gridY}`;
      newPixels[key] = {
        id: crypto.randomUUID(),
        x: gridX,
        y: gridY,
        width: brushSize.width,
        height: brushSize.height,
        color: currentColor,
        type: 1,
      };
    } else {
      // 替换逻辑
      const key = `${startX},${startY}`;
      // 清理重叠像素
      Object.keys(newPixels).forEach(existingKey => {
        const pixel = newPixels[existingKey];
        const existingRight = pixel.x + pixel.width;
        const existingBottom = pixel.y + pixel.height;
        
        if (startX < existingRight &&
            startX + brushSize.width > pixel.x &&
            startY < existingBottom &&
            startY + brushSize.height > pixel.y) {
          delete newPixels[existingKey];
        }
      });
      
      // 添加新像素
      newPixels[key] = {
        id: crypto.randomUUID(),
        x: startX,
        y: startY,
        width: brushSize.width,
        height: brushSize.height,
        color: currentColor,
        type: 1,
      };
    }
    return newPixels;
  }
  
  // 拖拽绘制
  if (!isClick) {
    const key = `${startX},${startY}`;
    
    if (isLeftClick) {
      // 清理重叠像素
      Object.keys(newPixels).forEach(existingKey => {
        const pixel = newPixels[existingKey];
        if (startX < pixel.x + pixel.width &&
            startX + brushSize.width > pixel.x &&
            startY < pixel.y + pixel.height &&
            startY + brushSize.height > pixel.y) {
          delete newPixels[existingKey];
        }
      });
      
      newPixels[key] = {
        id: crypto.randomUUID(),
        x: startX,
        y: startY,
        width: brushSize.width,
        height: brushSize.height,
        color: currentColor,
        type: 1,
      };
    } else if (isRightClick) {
      // 右键拖拽：区域删除
      Object.keys(newPixels).forEach(key => {
        const pixel = newPixels[key];
        if (startX < pixel.x + pixel.width &&
            startX + brushSize.width > pixel.x &&
            startY < pixel.y + pixel.height &&
            startY + brushSize.height > pixel.y) {
          delete newPixels[key];
        }
      });
    }
  }
  
  return newPixels;
};

// 新增：拖拽绘制函数（带碰撞检测）
export const brushPaintDrag = (options: BrushPaintOptions & {
  lastPos: Position | null;
}): { newPixels: Record<string, PixelBlock>; newLastPos: Position } => {
  const {
    pixels,
    brushSize,
    currentColor,
    isLeftClick,
    isRightClick,
    worldPos,
    lastPos,
  } = options;
  
  const gridX = Math.floor(worldPos.x);
  const gridY = Math.floor(worldPos.y);
  const newPixels = { ...pixels };
  
  // 如果没有上一次位置（刚开始拖拽），直接处理当前点
  if (!lastPos) {
    const result = brushPaint({
      pixels: newPixels,
      brushSize,
      currentColor,
      isLeftClick,
      isRightClick,
      worldPos,
      isClick: false,
    });
    return { newPixels: result, newLastPos: { x: gridX, y: gridY } };
  }
  
  const lastX = Math.floor(lastPos.x);
  const lastY = Math.floor(lastPos.y);
  
  // 如果位置没有变化，返回原像素
  if (lastX === gridX && lastY === gridY) {
    return { newPixels, newLastPos: lastPos };
  }
  
  // 使用 Bresenham 算法获取两点间的所有整数点
  const points = bresenhamLine(lastX, lastY, gridX, gridY);
  
  // 根据笔刷大小调整采样步长
  const step = Math.max(1, Math.min(brushSize.width, brushSize.height));
  
  // 处理每个采样点
  let currentPixels = { ...newPixels };
  
  points.forEach((point, index) => {
    if (index % step === 0 || index === points.length - 1) {
      currentPixels = brushPaint({
        pixels: currentPixels,
        brushSize,
        currentColor,
        isLeftClick,
        isRightClick,
        worldPos: point,
        isClick: false,
      });
    }
  });
  
  return { newPixels: currentPixels, newLastPos: { x: gridX, y: gridY } };
};

// 新增：简化版的笔刷绘制函数
export const simpleBrushPaint = (
  worldPos: Position,
  pixels: Record<string, PixelBlock>,
  brushSize: BrushSize,
  currentColor: string,
  isLeftClick: boolean,
  isRightClick: boolean
): Record<string, PixelBlock> => {
  const gridX = Math.floor(worldPos.x);
  const gridY = Math.floor(worldPos.y);
  const startX = gridX - Math.floor(brushSize.width / 2);
  const startY = gridY - Math.floor(brushSize.height / 2);
  const newPixels = { ...pixels };
  
  // 左键绘制
  if (isLeftClick) {
    const key = `${startX},${startY}`;
    
    // 清理重叠像素
    Object.keys(newPixels).forEach(existingKey => {
      const pixel = newPixels[existingKey];
      const existingRight = pixel.x + pixel.width;
      const existingBottom = pixel.y + pixel.height;
      
      if (startX < existingRight &&
          startX + brushSize.width > pixel.x &&
          startY < existingBottom &&
          startY + brushSize.height > pixel.y) {
        delete newPixels[existingKey];
      }
    });
    
    // 添加新像素
    newPixels[key] = {
      id: crypto.randomUUID(),
      x: startX,
      y: startY,
      width: brushSize.width,
      height: brushSize.height,
      color: currentColor,
      type: 1,
    };
  }
  // 右键擦除
  else if (isRightClick) {
    // 计算擦除区域
    const eraseStartX = startX;
    const eraseStartY = startY;
    const eraseEndX = eraseStartX + brushSize.width;
    const eraseEndY = eraseStartY + brushSize.height;
    
    // 遍历所有像素块，检查是否与擦除区域相交
    Object.keys(newPixels).forEach(key => {
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
        }
        // 如果部分覆盖，删除整个像素块（简化处理，避免复杂分割）
        else {
          delete newPixels[key];
        }
      }
    });
  }
  
  return newPixels;
};