import { Position } from "../core/types";

// 世界坐标转换为画布像素
const worldToPixel = (
  world: number,
  half: number,
  offset: number,
  scale: number,
  dpr: number,
  pixelSize: number
) => half - offset * dpr * scale + world * pixelSize * dpr * scale;

// 计算合适的网格间距倍数
const calculateGridMultiple = (pixelSizeOnScreen: number): number => {
  const IDEAL_GRID_SPACING = 64;
  const idealMultiple = IDEAL_GRID_SPACING / pixelSizeOnScreen;
  const exponent = Math.round(Math.log2(idealMultiple));
  const minExponent = 0;
  const maxExponent = 7;
  const clampedExponent = Math.max(minExponent, Math.min(maxExponent, exponent));
  return Math.pow(2, clampedExponent);
};

// 新增类型定义
interface GridBoundary {
  width: number;  // 宽度（以基础步长 pixelSize 为单位）
  height: number; // 高度（以基础步长 pixelSize 为单位）
}

export const drawGrid = (
  ctx: CanvasRenderingContext2D,
  offsetPoint: Position,
  scale: number,
  pixelSize: number,
  canvasWidth: number,
  canvasHeight: number,
  boundary?: GridBoundary // 新增：边界控制参数
) => {
  const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
  const halfWidth = (canvasWidth / 2) * dpr;
  const halfHeight = (canvasHeight / 2) * dpr;

  const pixelSizeOnScreen = pixelSize * scale * dpr;
  
  const colors = {
    grid: {
      subtle: "#f5f5f7",
      primary: "#e1e1e6",
      axis: "#8e8e93",
      origin: "#007aff"
    },
    background: "#ffffff",
    outside: "#f2f2f5",     // 新增：边界外的颜色（略深）
    shadow: "rgba(0, 0, 0, 0.06)" // 新增：边界投影
  };
  
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  // --- 1. 背景层绘制 ---
  ctx.save();
  ctx.scale(1 / dpr, 1 / dpr);

  if (boundary) {
    // A. 如果有边界：先绘制外部背景
    ctx.fillStyle = colors.outside;
    ctx.fillRect(0, 0, canvasWidth * dpr, canvasHeight * dpr);

    // B. 计算边界矩形（假设边界以原点为中心）
    // 左上角的世界坐标
    const boundLeftWorld = -boundary.width / 2;
    const boundTopWorld = -boundary.height / 2;
    
    // 转换为屏幕像素
    const boundX = worldToPixel(boundLeftWorld, halfWidth, offsetPoint.x, scale, dpr, pixelSize);
    const boundY = worldToPixel(boundTopWorld, halfHeight, offsetPoint.y, scale, dpr, pixelSize);
    
    // 计算屏幕上的宽高
    const boundW = boundary.width * pixelSizeOnScreen;
    const boundH = boundary.height * pixelSizeOnScreen;

    // C. 绘制工作区（带阴影的白纸效果）
    // 只有当工作区在屏幕内可见时才绘制阴影，提升性能
    if (boundX + boundW > 0 && boundX < canvasWidth * dpr &&
        boundY + boundH > 0 && boundY < canvasHeight * dpr) {
      
      ctx.shadowColor = colors.shadow;
      ctx.shadowBlur = 30 * dpr;
      ctx.shadowOffsetY = 10 * dpr;
      
      ctx.fillStyle = colors.background;
      ctx.fillRect(boundX, boundY, boundW, boundH);
      
      // 清除阴影设置，避免影响后续绘制
      ctx.shadowColor = "transparent";
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;
    }
  } else {
    // 无边界模式：全屏纯白
    ctx.fillStyle = colors.background;
    ctx.fillRect(0, 0, canvasWidth * dpr, canvasHeight * dpr);
  }
  ctx.restore();

  // --- 2. 网格层绘制 (逻辑保持不变) ---
  const gridMultiple = calculateGridMultiple(pixelSizeOnScreen);
  const gridStep = gridMultiple * pixelSize;
  const gridStepPx = gridStep * scale * dpr;

  ctx.save();
  ctx.scale(1 / dpr, 1 / dpr);

  const worldLeft = (-halfWidth + offsetPoint.x * dpr * scale) / (pixelSize * dpr * scale);
  const worldTop = (-halfHeight + offsetPoint.y * dpr * scale) / (pixelSize * dpr * scale);

  const firstGridX = Math.floor(worldLeft / gridStep) * gridStep;
  const firstGridY = Math.floor(worldTop / gridStep) * gridStep;

  const firstPixelX = worldToPixel(firstGridX, halfWidth, offsetPoint.x, scale, dpr, pixelSize);
  const firstPixelY = worldToPixel(firstGridY, halfHeight, offsetPoint.y, scale, dpr, pixelSize);

  // 绘制主网格线
  const drawGridLines = () => {
    // 如果存在边界，我们可以选择仅在边界内绘制网格，或者全屏绘制。
    // 为了保持类似 Figma 的无限画布体验，通常全屏绘制网格，但背景色的差异区分了工作区。
    
    // 次网格逻辑
    if (gridMultiple > 1 && scale > 0.5) {
      const subGridMultiple = gridMultiple / 2;
      if (subGridMultiple >= 1) {
        const subGridStep = subGridMultiple * pixelSize;
        const subGridStepPx = subGridStep * scale * dpr;
        const firstSubGridX = Math.floor(worldLeft / subGridStep) * subGridStep;
        const firstSubGridY = Math.floor(worldTop / subGridStep) * subGridStep;
        const firstSubPixelX = worldToPixel(firstSubGridX, halfWidth, offsetPoint.x, scale, dpr, pixelSize);
        const firstSubPixelY = worldToPixel(firstSubGridY, halfHeight, offsetPoint.y, scale, dpr, pixelSize);

        ctx.strokeStyle = colors.grid.subtle;
        ctx.lineWidth = 0.3 * dpr;
        
        ctx.beginPath();
        // 优化：合并循环逻辑，减少代码重复
        const maxX = canvasWidth * dpr;
        const maxY = canvasHeight * dpr;
        
        for (let x = firstSubPixelX; x <= maxX; x += subGridStepPx) {
          const drawX = Math.floor(x) + 0.5;
          ctx.moveTo(drawX, 0);
          ctx.lineTo(drawX, maxY);
        }
        for (let y = firstSubPixelY; y <= maxY; y += subGridStepPx) {
          const drawY = Math.floor(y) + 0.5;
          ctx.moveTo(0, drawY);
          ctx.lineTo(maxX, drawY);
        }
        ctx.stroke();
      }
    }

    // 主网格
    ctx.strokeStyle = colors.grid.primary;
    ctx.lineWidth = 0.5 * dpr;
    
    ctx.beginPath();
    const maxX = canvasWidth * dpr;
    const maxY = canvasHeight * dpr;

    for (let x = firstPixelX; x <= maxX; x += gridStepPx) {
      const drawX = Math.floor(x) + 0.5;
      ctx.moveTo(drawX, 0);
      ctx.lineTo(drawX, maxY);
    }
    for (let y = firstPixelY; y <= maxY; y += gridStepPx) {
      const drawY = Math.floor(y) + 0.5;
      ctx.moveTo(0, drawY);
      ctx.lineTo(maxX, drawY);
    }
    ctx.stroke();
  };

  drawGridLines();

  // --- 3. 坐标轴与原点 ---
  const originX = worldToPixel(0, halfWidth, offsetPoint.x, scale, dpr, pixelSize);
  const originY = worldToPixel(0, halfHeight, offsetPoint.y, scale, dpr, pixelSize);
  
  // 仅当原点在可视范围内或附近时绘制
  const padding = 20 * dpr;
  if (originX >= -padding && originX <= canvasWidth * dpr + padding && 
      originY >= -padding && originY <= canvasHeight * dpr + padding) {
    
    ctx.strokeStyle = colors.grid.axis;
    ctx.lineWidth = 1 * dpr;
    ctx.beginPath();
    
    // 绘制轴线（根据边界裁剪轴线长短会显得不够大气，建议保持无限长轴线）
    if (originX >= 0 && originX <= canvasWidth * dpr) {
      ctx.moveTo(originX + 0.5, 0);
      ctx.lineTo(originX + 0.5, canvasHeight * dpr);
    }
    if (originY >= 0 && originY <= canvasHeight * dpr) {
      ctx.moveTo(0, originY + 0.5);
      ctx.lineTo(canvasWidth * dpr, originY + 0.5);
    }
    ctx.stroke();
    
    // 原点样式
    ctx.fillStyle = colors.grid.origin;
    ctx.beginPath();
    ctx.arc(originX + 0.5, originY + 0.5, 3 * dpr, 0, Math.PI * 2);
    ctx.fill();
    
    // 原点辉光
    ctx.beginPath();
    ctx.arc(originX + 0.5, originY + 0.5, 6 * dpr, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(0, 122, 255, 0.15)`;
    ctx.fill();
  }

  // 可选：如果设置了边界，绘制边界轮廓线，增强视觉边界感
  if (boundary) {
    const boundLeftWorld = -boundary.width / 2;
    const boundTopWorld = -boundary.height / 2;
    const boundX = worldToPixel(boundLeftWorld, halfWidth, offsetPoint.x, scale, dpr, pixelSize);
    const boundY = worldToPixel(boundTopWorld, halfHeight, offsetPoint.y, scale, dpr, pixelSize);
    const boundW = boundary.width * pixelSizeOnScreen;
    const boundH = boundary.height * pixelSizeOnScreen;

    ctx.strokeStyle = colors.grid.primary; // 使用略深的网格色作为边框
    ctx.lineWidth = 1 * dpr;
    ctx.strokeRect(Math.floor(boundX) + 0.5, Math.floor(boundY) + 0.5, boundW, boundH);
  }

  ctx.restore();
};