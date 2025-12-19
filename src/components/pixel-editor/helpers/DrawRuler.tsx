import { Position } from "../_lib/validations";

// 将世界坐标转换为画布像素
const worldToCanvas = (
  worldUnits: number,
  half: number,
  offset: number,
  scale: number,
  dpr: number,
  pixelSize: number
) => half - offset * dpr * scale + worldUnits * pixelSize * dpr * scale;

// 画布像素转换为世界坐标
const canvasToWorld = (
  px: number,
  half: number,
  offset: number,
  scale: number,
  dpr: number,
  pixelSize: number
) => (px - half + offset * dpr * scale) / (pixelSize * dpr * scale);

// 选择刻度步长，基于pixelSize和缩放
const getRulerStep = (scale: number, pixelSize: number, dpr: number): number => {
  const pixelOnScreen = pixelSize * scale * dpr;
  
  // 简单的步长选择逻辑
  if (pixelOnScreen > 30) return 1;
  if (pixelOnScreen > 15) return 2;
  if (pixelOnScreen > 8) return 5;
  if (pixelOnScreen > 4) return 10;
  if (pixelOnScreen > 2) return 25;
  if (pixelOnScreen > 1) return 50;
  return 100;
};

export const drawRuler = (
  ctx: CanvasRenderingContext2D,
  offsetPoint: Position,
  scale: number,
  pixelSize: number,
  canvasWidth: number,
  canvasHeight: number,
  mousePosition?: Position | null
) => {
  const dpr = window.devicePixelRatio;
  const halfWidth = (canvasWidth / 2) * dpr;
  const halfHeight = (canvasHeight / 2) * dpr;

  // 标尺尺寸
  const rulerSize = 16 * dpr;
  
  // 获取刻度步长
  const step = getRulerStep(scale, pixelSize, dpr);
  const stepPx = step * pixelSize * scale * dpr;

  ctx.save();
  ctx.scale(1 / dpr, 1 / dpr);

  // 标尺背景
  ctx.fillStyle = "#f8f9fa";
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

  // X轴刻度
  const worldAtLeft = canvasToWorld(0, halfWidth, offsetPoint.x, scale, dpr, pixelSize);
  const firstTickWorldX = Math.floor(worldAtLeft / step) * step;
  const firstTickPxX = worldToCanvas(firstTickWorldX, halfWidth, offsetPoint.x, scale, dpr, pixelSize);

  ctx.strokeStyle = "#adb5bd";
  ctx.fillStyle = "#495057";
  ctx.font = `${9 * dpr}px -apple-system, system-ui, sans-serif`;

  // 绘制X轴刻度线
  for (let x = firstTickPxX; x <= canvasWidth * dpr; x += stepPx) {
    const worldX = canvasToWorld(x, halfWidth, offsetPoint.x, scale, dpr, pixelSize);
    
    // 主刻度（每10步）
    const isMajor = Math.round(worldX / step) % 10 === 0;
    const tickHeight = isMajor ? 8 : 4;
    
    const drawX = Math.floor(x) + 0.5;
    
    ctx.beginPath();
    ctx.moveTo(drawX, rulerSize);
    ctx.lineTo(drawX, rulerSize - tickHeight * dpr);
    ctx.stroke();
    
    // 刻度标签
    if (isMajor && x > rulerSize + 15 * dpr) {
      const label = Math.round(worldX).toString();
      ctx.fillText(label, x + 2 * dpr, rulerSize - 10 * dpr);
    }
  }

  // Y轴刻度
  const worldAtTop = canvasToWorld(0, halfHeight, offsetPoint.y, scale, dpr, pixelSize);
  const firstTickWorldY = Math.floor(worldAtTop / step) * step;
  const firstTickPxY = worldToCanvas(firstTickWorldY, halfHeight, offsetPoint.y, scale, dpr, pixelSize);

  // 绘制Y轴刻度线
  for (let y = firstTickPxY; y <= canvasHeight * dpr; y += stepPx) {
    const worldY = canvasToWorld(y, halfHeight, offsetPoint.y, scale, dpr, pixelSize);
    
    // 主刻度（每10步）
    const isMajor = Math.round(worldY / step) % 10 === 0;
    const tickWidth = isMajor ? 8 : 4;
    
    const drawY = Math.floor(y) + 0.5;
    
    ctx.beginPath();
    ctx.moveTo(rulerSize, drawY);
    ctx.lineTo(rulerSize - tickWidth * dpr, drawY);
    ctx.stroke();
    
    // 刻度标签
    if (isMajor && y > rulerSize + 15 * dpr) {
      ctx.save();
      ctx.translate(8 * dpr, y);
      ctx.rotate(-Math.PI / 2);
      const label = Math.round(worldY).toString();
      ctx.fillText(label, 2 * dpr, 0);
      ctx.restore();
    }
  }

  // 简约的鼠标位置指示
  if (mousePosition) {
    const mouseX = mousePosition.x * dpr;
    const mouseY = mousePosition.y * dpr;
    
    // 确保鼠标在编辑区域内
    if (mouseX > rulerSize && mouseY > rulerSize) {
      // X轴标尺上的指示器
      ctx.fillStyle = "#339af0";
      ctx.fillRect(mouseX - 0.5, rulerSize - 6 * dpr, 1, 6 * dpr);
      
      // Y轴标尺上的指示器
      ctx.fillRect(rulerSize - 6 * dpr, mouseY - 0.5, 6 * dpr, 1);
      
      // 显示坐标值（仅在坐标值离标尺边界足够远时显示）
      const worldX = canvasToWorld(mouseX, halfWidth, offsetPoint.x, scale, dpr, pixelSize);
      const worldY = canvasToWorld(mouseY, halfHeight, offsetPoint.y, scale, dpr, pixelSize);
      
      // X坐标显示在Y轴标尺上
      if (mouseY > rulerSize + 20 * dpr) {
        ctx.fillStyle = "#339af0";
        ctx.fillRect(0, mouseY - 7 * dpr, 12 * dpr, 14 * dpr);
        ctx.fillStyle = "#fff";
        const xLabel = Math.round(worldX).toString();
        ctx.fillText(xLabel, 2 * dpr, mouseY + 3 * dpr);
      }
      
      // Y坐标显示在X轴标尺上
      if (mouseX > rulerSize + 20 * dpr) {
        ctx.fillStyle = "#339af0";
        const yLabel = Math.round(worldY).toString();
        const textWidth = ctx.measureText(yLabel).width;
        ctx.fillRect(mouseX - textWidth / 2 - 2 * dpr, 0, textWidth + 4 * dpr, 12 * dpr);
        ctx.fillStyle = "#fff";
        ctx.fillText(yLabel, mouseX - textWidth / 2, 10 * dpr);
      }
    }
  }

  ctx.restore();
};