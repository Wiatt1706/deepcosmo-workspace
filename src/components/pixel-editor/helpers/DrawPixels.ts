import { Position, PixelBlock } from "../_lib/validations";

// 世界坐标转换为画布像素（与drawGrid保持一致）
const worldToPixel = (
  world: number,
  half: number,
  offset: number,
  scale: number,
  dpr: number,
  pixelSize: number
): number => half - offset * dpr * scale + world * pixelSize * dpr * scale;

export const drawPixels = (
  ctx: CanvasRenderingContext2D,
  pixels: Record<string, PixelBlock>,
  mapCenter: Position,
  scale: number,
  pixelSize: number,
  canvasWidth: number,
  canvasHeight: number
) => {
  const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
  const halfWidth = (canvasWidth / 2) * dpr;
  const halfHeight = (canvasHeight / 2) * dpr;
  
  // 使用与drawGrid相同的计算方式
  const pixelSizeOnScreen = pixelSize * scale * dpr;
  
  // 视口剔除范围（世界坐标）
  // 计算方式需要与drawGrid保持一致
  const worldAtLeft = (-halfWidth + mapCenter.x * dpr * scale) / (pixelSize * dpr * scale);
  const worldAtTop = (-halfHeight + mapCenter.y * dpr * scale) / (pixelSize * dpr * scale);
  const worldAtRight = worldAtLeft + (canvasWidth * dpr) / (pixelSize * dpr * scale);
  const worldAtBottom = worldAtTop + (canvasHeight * dpr) / (pixelSize * dpr * scale);
  
  // 稍微向外扩展一下范围，防止边缘闪烁
  const rangeBuffer = 2;
  const visibleMinX = worldAtLeft - rangeBuffer;
  const visibleMaxX = worldAtRight + rangeBuffer;
  const visibleMinY = worldAtTop - rangeBuffer;
  const visibleMaxY = worldAtBottom + rangeBuffer;
  
  // 开始绘制
  ctx.save();
  ctx.scale(1 / dpr, 1 / dpr); // 与drawGrid保持相同的缩放
  
  Object.values(pixels).forEach((block) => {
    // 视口剔除
    if (
      block.x + block.width < visibleMinX ||
      block.x > visibleMaxX ||
      block.y + block.height < visibleMinY ||
      block.y > visibleMaxY
    ) {
      return;
    }
    
    // 使用与drawGrid相同的worldToPixel函数计算坐标
    const screenX = worldToPixel(block.x, halfWidth, mapCenter.x, scale, dpr, pixelSize);
    const screenY = worldToPixel(block.y, halfHeight, mapCenter.y, scale, dpr, pixelSize);
    
    // 计算块的实际尺寸（与坐标计算保持一致）
    const actualWidth = block.width * pixelSizeOnScreen;
    const actualHeight = block.height * pixelSizeOnScreen;
    
    // 设置像素精确绘制
    const drawX = Math.floor(screenX) + 0.5;
    const drawY = Math.floor(screenY) + 0.5;
    const drawW = Math.floor(actualWidth);
    const drawH = Math.floor(actualHeight);
    
    ctx.fillStyle = block.color as string;
    ctx.fillRect(drawX, drawY, drawW, drawH);
  });
  
  ctx.restore();
};