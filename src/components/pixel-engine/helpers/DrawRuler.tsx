import { Position } from "../core/types";

// 将世界坐标转换为画布像素
const worldToCanvas = (
  worldUnits: number,
  half: number,
  offset: number,
  scale: number,
  dpr: number,
  pixelSize: number
): number => half - offset * dpr * scale + worldUnits * pixelSize * dpr * scale;

// 画布像素转换为世界坐标
const canvasToWorld = (
  px: number,
  half: number,
  offset: number,
  scale: number,
  dpr: number,
  pixelSize: number
): number => (px - half + offset * dpr * scale) / (pixelSize * dpr * scale);

// 刻度步长配置
const RULER_STEPS = [
  { minPixelSize: 30, step: 1 },
  { minPixelSize: 15, step: 2 },
  { minPixelSize: 8, step: 5 },
  { minPixelSize: 4, step: 10 },
  { minPixelSize: 2, step: 25 },
  { minPixelSize: 1, step: 50 },
  { minPixelSize: 0, step: 100 }
];

// 获取刻度步长
const getRulerStep = (scale: number, pixelSize: number, dpr: number): number => {
  const pixelOnScreen = pixelSize * scale * dpr;
  
  for (const { minPixelSize, step } of RULER_STEPS) {
    if (pixelOnScreen > minPixelSize) return step;
  }
  return 100;
};

// 绘制刻度线
const drawTicks = (
  ctx: CanvasRenderingContext2D,
  isXAxis: boolean,
  startWorld: number,
  startPx: number,
  stepPx: number,
  step: number,
  offset: number,
  half: number,
  scale: number,
  dpr: number,
  pixelSize: number,
  canvasSize: number,
  rulerSize: number
): void => {
  const tickCount = Math.ceil((canvasSize - startPx) / stepPx);
  
  for (let i = 0; i < tickCount; i++) {
    const px = startPx + i * stepPx;
    const world = startWorld + i * step;
    
    const isMajor = Math.round(world / step) % 10 === 0;
    const tickSize = (isMajor ? 8 : 4) * dpr;
    
    // 绘制刻度线
    ctx.beginPath();
    if (isXAxis) {
      const drawX = Math.floor(px) + 0.5;
      ctx.moveTo(drawX, rulerSize);
      ctx.lineTo(drawX, rulerSize - tickSize);
    } else {
      const drawY = Math.floor(px) + 0.5;
      ctx.moveTo(rulerSize, drawY);
      ctx.lineTo(rulerSize - tickSize, drawY);
    }
    ctx.stroke();
    
    // 绘制主刻度标签
    if (isMajor && px > rulerSize + 15 * dpr) {
      const label = Math.round(world).toString();
      
      if (isXAxis) {
        ctx.fillText(label, px + 2 * dpr, rulerSize - 6 * dpr);
      } else {
        ctx.save();
        ctx.translate(10 * dpr, px);
        ctx.rotate(-Math.PI / 2);
        ctx.fillText(label, 2 * dpr, 0);
        ctx.restore();
      }
    }
  }
};

// 绘制坐标指示器
const drawCoordinateIndicator = (
  ctx: CanvasRenderingContext2D,
  worldValue: number,
  px: number,
  isXAxis: boolean,
  rulerSize: number,
  dpr: number
): void => {
  const label = Math.round(worldValue).toString();
  ctx.save();
  
  // 测量文本尺寸
  ctx.font = `${9 * dpr}px -apple-system, system-ui, sans-serif`;
  const textWidth = ctx.measureText(label).width;
  const textHeight = 16 * dpr;
  const padding = 4 * dpr;
  
  if (isXAxis) {
    // X轴坐标显示在标尺顶部
    const totalWidth = textWidth + padding * 2;
    const totalHeight = textHeight;
    const labelX = px;
    const labelY = 8 * dpr;
    
    ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
    ctx.fillRect(labelX - totalWidth / 2, labelY - totalHeight / 2, totalWidth, totalHeight);
    
    ctx.fillStyle = "#fff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, labelX, labelY);
  } else {
    // Y轴坐标旋转显示
    const totalWidth = textHeight;
    const totalHeight = textWidth + padding * 2;
    
    ctx.translate(8 * dpr, px);
    ctx.rotate(-Math.PI / 2);
    
    ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
    ctx.fillRect(-totalHeight / 2, -totalWidth / 2, totalHeight, totalWidth);
    
    ctx.fillStyle = "#fff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, 0, 0);
  }
  
  ctx.restore();
};

export const drawRuler = (
  ctx: CanvasRenderingContext2D,
  offsetPoint: Position,
  scale: number,
  pixelSize: number,
  canvasWidth: number,
  canvasHeight: number,
  mousePosition?: Position | null
): void => {
  const dpr = window.devicePixelRatio;
  const halfWidth = (canvasWidth / 2) * dpr;
  const halfHeight = (canvasHeight / 2) * dpr;
  
  // 标尺尺寸和样式
  const rulerSize = 16 * dpr;
  const step = getRulerStep(scale, pixelSize, dpr);
  const stepPx = step * pixelSize * scale * dpr;
  
  ctx.save();
  ctx.scale(1 / dpr, 1 / dpr);
  
  // 标尺背景
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, rulerSize, canvasHeight * dpr);
  ctx.fillRect(0, 0, canvasWidth * dpr, rulerSize);
  
  // 分隔线
  ctx.strokeStyle = "#e9ecef";
  ctx.lineWidth = 1 * dpr;
  ctx.beginPath();
  ctx.moveTo(rulerSize, 0);
  ctx.lineTo(rulerSize, canvasHeight * dpr);
  ctx.moveTo(0, rulerSize);
  ctx.lineTo(canvasWidth * dpr, rulerSize);
  ctx.stroke();
  
  // 设置刻度线样式
  ctx.strokeStyle = "#adb5bd";
  ctx.fillStyle = "#495057";
  ctx.font = `${9 * dpr}px -apple-system, system-ui, sans-serif`;
  
  // 绘制X轴刻度
  const worldAtLeft = canvasToWorld(0, halfWidth, offsetPoint.x, scale, dpr, pixelSize);
  const firstTickWorldX = Math.floor(worldAtLeft / step) * step;
  const firstTickPxX = worldToCanvas(firstTickWorldX, halfWidth, offsetPoint.x, scale, dpr, pixelSize);
  
  drawTicks(
    ctx,
    true, // isXAxis
    firstTickWorldX,
    firstTickPxX,
    stepPx,
    step,
    offsetPoint.x,
    halfWidth,
    scale,
    dpr,
    pixelSize,
    canvasWidth * dpr,
    rulerSize
  );
  
  // 绘制Y轴刻度
  const worldAtTop = canvasToWorld(0, halfHeight, offsetPoint.y, scale, dpr, pixelSize);
  const firstTickWorldY = Math.floor(worldAtTop / step) * step;
  const firstTickPxY = worldToCanvas(firstTickWorldY, halfHeight, offsetPoint.y, scale, dpr, pixelSize);
  
  drawTicks(
    ctx,
    false, // isXAxis
    firstTickWorldY,
    firstTickPxY,
    stepPx,
    step,
    offsetPoint.y,
    halfHeight,
    scale,
    dpr,
    pixelSize,
    canvasHeight * dpr,
    rulerSize
  );
  
  // 绘制鼠标位置指示器
  if (mousePosition && mousePosition.x > rulerSize / dpr && mousePosition.y > rulerSize / dpr) {
    const mouseX = mousePosition.x * dpr;
    const mouseY = mousePosition.y * dpr;
    
    const worldX = canvasToWorld(mouseX, halfWidth, offsetPoint.x, scale, dpr, pixelSize);
    const worldY = canvasToWorld(mouseY, halfHeight, offsetPoint.y, scale, dpr, pixelSize);
    
    // 设置指示器样式
    ctx.strokeStyle = "#339af0";
    ctx.lineWidth = 1 * dpr;
    
    // X轴标尺上的垂直指示线
    ctx.beginPath();
    ctx.moveTo(mouseX + 0.5, rulerSize);
    ctx.lineTo(mouseX + 0.5, rulerSize - 6 * dpr);
    ctx.stroke();
    
    // Y轴标尺上的水平指示线
    ctx.beginPath();
    ctx.moveTo(rulerSize, mouseY + 0.5);
    ctx.lineTo(rulerSize - 6 * dpr, mouseY + 0.5);
    ctx.stroke();
    
    // 显示坐标（距离边缘足够远时）
    const minDistanceFromEdge = 30 * dpr;
    
    if (mouseY > rulerSize + minDistanceFromEdge) {
      drawCoordinateIndicator(ctx, worldX, mouseY, false, rulerSize, dpr);
    }
    
    if (mouseX > rulerSize + minDistanceFromEdge) {
      drawCoordinateIndicator(ctx, worldY, mouseX, true, rulerSize, dpr);
    }
  }
  
  ctx.restore();
};