import { Position } from "../_lib/validations";

// 世界坐标转换为画布像素
const worldToPixel = (
  world: number,
  half: number,
  offset: number,
  scale: number,
  dpr: number,
  pixelSize: number
) => half - offset * dpr * scale + world * pixelSize * dpr * scale;

export const drawGrid = (
  ctx: CanvasRenderingContext2D,
  offsetPoint: Position,
  scale: number,
  pixelSize: number,
  canvasWidth: number,
  canvasHeight: number
) => {
  const dpr = window.devicePixelRatio;
  const halfWidth = (canvasWidth / 2) * dpr;
  const halfHeight = (canvasHeight / 2) * dpr;

  // 基于pixelSize和缩放，自动调整网格密度
  // 确保网格间距在屏幕上清晰可见（8-32像素之间）
  const minGridSpacingPx = 8;  // 最小网格间距（像素）
  const maxGridSpacingPx = 32; // 最大网格间距（像素）
  
  // 计算一个基础网格间距（以pixelSize为单位）
  let gridMultiple = 1;
  
  // 计算当前一个pixelSize在屏幕上的像素大小
  const pixelSizeOnScreen = pixelSize * scale * dpr;
  
  // 根据pixelSize在屏幕上的大小调整网格密度
  if (pixelSizeOnScreen < minGridSpacingPx / 2) {
    // 如果像素太小，增加网格间距倍数
    gridMultiple = Math.pow(2, Math.ceil(Math.log2(minGridSpacingPx / pixelSizeOnScreen)));
  } else if (pixelSizeOnScreen > maxGridSpacingPx) {
    // 如果像素太大，每个像素都显示网格
    gridMultiple = 1;
  } else if (pixelSizeOnScreen > maxGridSpacingPx / 2) {
    // 中等大小，使用较小的网格
    gridMultiple = 1;
  } else {
    // 选择2、5、10的倍数，使得网格间距在合理范围内
    const targetMultiple = minGridSpacingPx / pixelSizeOnScreen;
    if (targetMultiple <= 2) gridMultiple = 2;
    else if (targetMultiple <= 5) gridMultiple = 5;
    else if (targetMultiple <= 10) gridMultiple = 10;
    else gridMultiple = Math.pow(2, Math.ceil(Math.log2(targetMultiple / 10))) * 10;
  }
  
  const gridStep = gridMultiple * pixelSize;
  const gridStepPx = gridStep * scale * dpr;

  ctx.save();
  ctx.scale(1 / dpr, 1 / dpr);

  // 计算视口边界对应的世界坐标
  const worldLeft = (-halfWidth + offsetPoint.x * dpr * scale) / (pixelSize * dpr * scale);
  const worldRight = (halfWidth + offsetPoint.x * dpr * scale) / (pixelSize * dpr * scale);
  const worldTop = (-halfHeight + offsetPoint.y * dpr * scale) / (pixelSize * dpr * scale);
  const worldBottom = (halfHeight + offsetPoint.y * dpr * scale) / (pixelSize * dpr * scale);

  // 对齐到网格步长
  const firstGridX = Math.floor(worldLeft / gridStep) * gridStep;
  const firstGridY = Math.floor(worldTop / gridStep) * gridStep;

  // 转换为像素坐标
  const firstPixelX = worldToPixel(firstGridX, halfWidth, offsetPoint.x, scale, dpr, pixelSize);
  const firstPixelY = worldToPixel(firstGridY, halfHeight, offsetPoint.y, scale, dpr, pixelSize);

  // 绘制网格线（非常淡的颜色，不干扰像素内容）
  ctx.strokeStyle = "#e8e8e8";
  ctx.lineWidth = 0.5 * dpr;
  
  // 垂直网格线
  ctx.beginPath();
  for (let x = firstPixelX; x <= canvasWidth * dpr; x += gridStepPx) {
    const drawX = Math.floor(x) + 0.5;
    ctx.moveTo(drawX, 0);
    ctx.lineTo(drawX, canvasHeight * dpr);
  }
  for (let x = firstPixelX - gridStepPx; x >= 0; x -= gridStepPx) {
    const drawX = Math.floor(x) + 0.5;
    ctx.moveTo(drawX, 0);
    ctx.lineTo(drawX, canvasHeight * dpr);
  }
  ctx.stroke();

  // 水平网格线
  ctx.beginPath();
  for (let y = firstPixelY; y <= canvasHeight * dpr; y += gridStepPx) {
    const drawY = Math.floor(y) + 0.5;
    ctx.moveTo(0, drawY);
    ctx.lineTo(canvasWidth * dpr, drawY);
  }
  for (let y = firstPixelY - gridStepPx; y >= 0; y -= gridStepPx) {
    const drawY = Math.floor(y) + 0.5;
    ctx.moveTo(0, drawY);
    ctx.lineTo(canvasWidth * dpr, drawY);
  }
  ctx.stroke();

  // 绘制原点（仅当可见时）
  const originX = worldToPixel(0, halfWidth, offsetPoint.x, scale, dpr, pixelSize);
  const originY = worldToPixel(0, halfHeight, offsetPoint.y, scale, dpr, pixelSize);
  
  if (originX >= 0 && originX <= canvasWidth * dpr && 
      originY >= 0 && originY <= canvasHeight * dpr) {
    
    // 坐标轴
    ctx.strokeStyle = "#cccccc";
    ctx.lineWidth = 1 * dpr;
    ctx.beginPath();
    ctx.moveTo(originX, 0);
    ctx.lineTo(originX, canvasHeight * dpr);
    ctx.moveTo(0, originY);
    ctx.lineTo(canvasWidth * dpr, originY);
    ctx.stroke();
    
    // 原点标记
    ctx.fillStyle = "#999999";
    const crossSize = 3 * dpr;
    ctx.fillRect(originX - 1, originY - crossSize/2, 2, crossSize);
    ctx.fillRect(originX - crossSize/2, originY - 1, crossSize, 2);
  }

  ctx.restore();
};