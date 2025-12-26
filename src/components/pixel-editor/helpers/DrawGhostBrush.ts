// helpers/DrawGhostBrush.ts
import { Position } from "../_lib/validations";

interface BrushSize {
  width: number;
  height: number;
}

// 苹果风格的设计原则：
// 1. 优雅的层次感
// 2. 完美的抗锯齿
// 3. 微妙的动画和过渡
// 4. 清晰的视觉反馈
// 5. 一致的视觉语言

export const drawGhostBrush = (
  ctx: CanvasRenderingContext2D,
  mousePos: Position | null,
  mapCenter: Position,
  scale: number,
  pixelSize: number,
  canvasWidth: number,
  canvasHeight: number,
  brushSize: BrushSize,
  color: string
) => {
  if (!mousePos) return;

  const dpr = window.devicePixelRatio || 1;
  
  // 计算网格对齐位置
  const halfWidth = canvasWidth / 2;
  const halfHeight = canvasHeight / 2;
  
  const offsetX = mousePos.x - halfWidth;
  const offsetY = mousePos.y - halfHeight;

  const worldX = (offsetX / scale) + mapCenter.x;
  const worldY = (offsetY / scale) + mapCenter.y;

  const gridX = Math.floor(worldX / pixelSize);
  const gridY = Math.floor(worldY / pixelSize);

  const startX = gridX - Math.floor(brushSize.width / 2);
  const startY = gridY - Math.floor(brushSize.height / 2);

  const screenX = (startX * pixelSize - mapCenter.x) * scale + halfWidth;
  const screenY = (startY * pixelSize - mapCenter.y) * scale + halfHeight;
  const screenWidth = brushSize.width * pixelSize * scale;
  const screenHeight = brushSize.height * pixelSize * scale;

  ctx.save();

  // 苹果风格的设计：层次分明的视觉效果
  // 层级1：柔和的填充背景
  drawSubtleBackground(ctx, screenX, screenY, screenWidth, screenHeight, color, scale);
  
  // 层级2：精确的网格系统
  drawPrecisionGrid(ctx, screenX, screenY, screenWidth, screenHeight, brushSize, scale);
  
  // 层级3：优雅的边框系统
  drawElegantBorder(ctx, screenX, screenY, screenWidth, screenHeight, color, scale);
  
  // 层级4：精致的十字准星
  drawRefinedCrosshair(ctx, screenX, screenY, screenWidth, screenHeight, brushSize, color, scale);
  
  // 层级5：智能的尺寸指示器
  drawIntelligentSizeIndicator(ctx, screenX, screenY, screenWidth, screenHeight, brushSize, scale, color);

  ctx.restore();
};

// 层级1：柔和的填充背景
const drawSubtleBackground = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  color: string,
  scale: number
) => {
  // 苹果风格：使用极低不透明度的渐变填充
  const alpha = 0.03 + Math.min(0.07, 0.1 / scale); // 随缩放动态调整透明度
  
  // 创建径向渐变填充
  const centerX = x + width / 2;
  const centerY = y + height / 2;
  const gradient = ctx.createRadialGradient(
    centerX, centerY, 0,
    centerX, centerY, Math.min(width, height) / 2
  );
  
  gradient.addColorStop(0, hexToRgba(color, alpha * 1.5));
  gradient.addColorStop(0.5, hexToRgba(color, alpha));
  gradient.addColorStop(1, hexToRgba(color, alpha * 0.3));
  
  ctx.fillStyle = gradient;
  ctx.fillRect(x, y, width, height);
};

// 层级2：精确的网格系统
const drawPrecisionGrid = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  brushSize: BrushSize,
  scale: number
) => {
  if (brushSize.width <= 1 && brushSize.height <= 1) return;
  
  const lineWidth = Math.max(0.25, 0.5 / scale);
  ctx.lineWidth = lineWidth;
  
  // 苹果风格：使用极细的虚线，几乎不可见但能提供精确定位
  ctx.setLineDash([1, 2]);
  
  // 计算单元格尺寸
  const cellWidth = width / brushSize.width;
  const cellHeight = height / brushSize.height;
  
  // 垂直网格线
  for (let i = 1; i < brushSize.width; i++) {
    const lineX = x + i * cellWidth;
    
    // 使用半透明白色，在所有背景下都可见
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.beginPath();
    ctx.moveTo(lineX, y);
    ctx.lineTo(lineX, y + height);
    ctx.stroke();
    
    // 黑色描边，增强对比
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.15)';
    ctx.beginPath();
    ctx.moveTo(lineX + lineWidth, y);
    ctx.lineTo(lineX + lineWidth, y + height);
    ctx.stroke();
  }
  
  // 水平网格线
  for (let i = 1; i < brushSize.height; i++) {
    const lineY = y + i * cellHeight;
    
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.beginPath();
    ctx.moveTo(x, lineY);
    ctx.lineTo(x + width, lineY);
    ctx.stroke();
    
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.15)';
    ctx.beginPath();
    ctx.moveTo(x, lineY + lineWidth);
    ctx.lineTo(x + width, lineY + lineWidth);
    ctx.stroke();
  }
  
  ctx.setLineDash([]);
};

// 层级3：优雅的边框系统
const drawElegantBorder = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  color: string,
  scale: number
) => {
  // 苹果风格：多层边框，创造深度感
  
  // 第一层：柔和的外发光
  ctx.shadowColor = hexToRgba(color, 0.2);
  ctx.shadowBlur = 4;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
  
  ctx.strokeStyle = 'transparent';
  ctx.lineWidth = 1;
  ctx.strokeRect(x - 1, y - 1, width + 2, height + 2);
  
  ctx.shadowColor = 'transparent';
  
  // 第二层：细边框
  ctx.strokeStyle = hexToRgba(color, 0.8);
  ctx.lineWidth = Math.max(0.5, 1 / scale);
  ctx.strokeRect(x, y, width, height);
  
  // 第三层：内发光效果
  const innerRectWidth = Math.max(1, 2 / scale);
  ctx.strokeStyle = hexToRgba(color, 0.4);
  ctx.lineWidth = innerRectWidth;
  ctx.strokeRect(x + innerRectWidth, y + innerRectWidth, 
                 width - innerRectWidth * 2, height - innerRectWidth * 2);
  
  // 第四层：高光边框（顶部和左侧）
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
  ctx.lineWidth = Math.max(0.25, 0.5 / scale);
  
  ctx.beginPath();
  // 上边框
  ctx.moveTo(x, y);
  ctx.lineTo(x + width, y);
  // 左边框
  ctx.moveTo(x, y);
  ctx.lineTo(x, y + height);
  ctx.stroke();
  
  // 第五层：阴影边框（底部和右侧）
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
  
  ctx.beginPath();
  // 下边框
  ctx.moveTo(x, y + height);
  ctx.lineTo(x + width, y + height);
  // 右边框
  ctx.moveTo(x + width, y);
  ctx.lineTo(x + width, y + height);
  ctx.stroke();
};

// 层级4：精致的十字准星
const drawRefinedCrosshair = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  brushSize: BrushSize,
  color: string,
  scale: number
) => {
  const centerX = x + width / 2;
  const centerY = y + height / 2;
  
  const lineLength = Math.max(3, 8 / scale);
  const lineWidth = Math.max(0.5, 1 / scale);
  const centerRadius = Math.max(0.5, 1.5 / scale);
  
  // 苹果风格：精细的渐变十字准星
  
  // 水平线
  const hGradient = ctx.createLinearGradient(
    centerX - lineLength, centerY,
    centerX + lineLength, centerY
  );
  hGradient.addColorStop(0, 'rgba(255, 255, 255, 0)');
  hGradient.addColorStop(0.3, 'rgba(255, 255, 255, 0.7)');
  hGradient.addColorStop(0.5, 'rgba(255, 255, 255, 1)');
  hGradient.addColorStop(0.7, 'rgba(255, 255, 255, 0.7)');
  hGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
  
  ctx.strokeStyle = hGradient;
  ctx.lineWidth = lineWidth;
  ctx.lineCap = 'round';
  
  ctx.beginPath();
  ctx.moveTo(centerX - lineLength, centerY);
  ctx.lineTo(centerX + lineLength, centerY);
  ctx.stroke();
  
  // 垂直线
  const vGradient = ctx.createLinearGradient(
    centerX, centerY - lineLength,
    centerX, centerY + lineLength
  );
  vGradient.addColorStop(0, 'rgba(255, 255, 255, 0)');
  vGradient.addColorStop(0.3, 'rgba(255, 255, 255, 0.7)');
  vGradient.addColorStop(0.5, 'rgba(255, 255, 255, 1)');
  vGradient.addColorStop(0.7, 'rgba(255, 255, 255, 0.7)');
  vGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
  
  ctx.strokeStyle = vGradient;
  
  ctx.beginPath();
  ctx.moveTo(centerX, centerY - lineLength);
  ctx.lineTo(centerX, centerY + lineLength);
  ctx.stroke();
  
  // 苹果风格的中心点
  const centerGradient = ctx.createRadialGradient(
    centerX, centerY, 0,
    centerX, centerY, centerRadius * 1.5
  );
  centerGradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
  centerGradient.addColorStop(0.5, hexToRgba(color, 0.8));
  centerGradient.addColorStop(1, hexToRgba(color, 0));
  
  ctx.fillStyle = centerGradient;
  ctx.beginPath();
  ctx.arc(centerX, centerY, centerRadius, 0, Math.PI * 2);
  ctx.fill();
  
  // 中心点边框
  ctx.strokeStyle = hexToRgba(color, 0.5);
  ctx.lineWidth = lineWidth * 0.5;
  ctx.beginPath();
  ctx.arc(centerX, centerY, centerRadius, 0, Math.PI * 2);
  ctx.stroke();
  
  // 只有在笔刷大小大于1时才绘制角标记
  if (brushSize.width > 1 || brushSize.height > 1) {
    drawAppleCornerMarks(ctx, x, y, width, height, scale);
  }
};

// 苹果风格的角标记
const drawAppleCornerMarks = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  scale: number
) => {
  const cornerSize = Math.max(2, 4 / scale);
  const lineWidth = Math.max(0.25, 0.5 / scale);
  
  ctx.lineWidth = lineWidth;
  ctx.lineCap = 'round';
  
  // 苹果风格：非常精细的角标记，使用渐变
  const gradient = ctx.createLinearGradient(0, 0, cornerSize, cornerSize);
  gradient.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
  gradient.addColorStop(1, 'rgba(255, 255, 255, 0.4)');
  
  ctx.strokeStyle = gradient;
  
  // 四个角
  // 左上角
  ctx.beginPath();
  ctx.moveTo(x + lineWidth, y + cornerSize);
  ctx.lineTo(x + lineWidth, y + lineWidth);
  ctx.lineTo(x + cornerSize, y + lineWidth);
  ctx.stroke();
  
  // 右上角
  ctx.beginPath();
  ctx.moveTo(x + width - cornerSize, y + lineWidth);
  ctx.lineTo(x + width - lineWidth, y + lineWidth);
  ctx.lineTo(x + width - lineWidth, y + cornerSize);
  ctx.stroke();
  
  // 左下角
  ctx.beginPath();
  ctx.moveTo(x + lineWidth, y + height - cornerSize);
  ctx.lineTo(x + lineWidth, y + height - lineWidth);
  ctx.lineTo(x + cornerSize, y + height - lineWidth);
  ctx.stroke();
  
  // 右下角
  ctx.beginPath();
  ctx.moveTo(x + width - cornerSize, y + height - lineWidth);
  ctx.lineTo(x + width - lineWidth, y + height - lineWidth);
  ctx.lineTo(x + width - lineWidth, y + height - cornerSize);
  ctx.stroke();
};

// 层级5：智能的尺寸指示器
const drawIntelligentSizeIndicator = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  brushSize: BrushSize,
  scale: number,
  color: string
) => {
  if (brushSize.width <= 1 && brushSize.height <= 1) return;
  
  // 苹果风格：只有当笔刷大小有实际意义时才显示尺寸
  const fontSize = Math.max(9, 11 / scale);
  const paddingX = Math.max(3, 5 / scale);
  const paddingY = Math.max(1, 2 / scale);
  const borderRadius = Math.max(1, 2 / scale);
  
  const text = `${brushSize.width} × ${brushSize.height}`;
  
  ctx.save();
  ctx.font = `${fontSize}px -apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  // 测量文本尺寸
  const metrics = ctx.measureText(text);
  const textWidth = metrics.width;
  const textHeight = fontSize;
  
  // 计算标签位置（右上角外部）
  const labelX = x + width + paddingX + textWidth / 2;
  const labelY = y - paddingY - textHeight / 2;
  
  // 背景
  ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
  
  // 圆角矩形背景
  drawRoundedRect(
    ctx,
    labelX - textWidth / 2 - paddingX,
    labelY - textHeight / 2 - paddingY,
    textWidth + paddingX * 2,
    textHeight + paddingY * 2,
    borderRadius
  );
  
  // 连接线
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.85)';
  ctx.lineWidth = Math.max(0.5, 1 / scale);
  ctx.lineCap = 'round';
  
  ctx.beginPath();
  ctx.moveTo(x + width, y);
  ctx.lineTo(labelX - textWidth / 2 - paddingX, labelY);
  ctx.stroke();
  
  // 文本
  ctx.fillStyle = hexToRgba(color, 0.9);
  ctx.fillText(text, labelX, labelY);
  
  // 文本阴影
  ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
  ctx.shadowBlur = 1;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 1;
  ctx.fillText(text, labelX, labelY);
  
  ctx.shadowColor = 'transparent';
  ctx.restore();
};

// 工具函数
const hexToRgba = (hex: string, alpha: number = 1): string => {
  hex = hex.replace('#', '');
  
  if (hex.length === 3) {
    hex = hex.split('').map(c => c + c).join('');
  }
  
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const drawRoundedRect = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) => {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
  ctx.fill();
};

// 高级功能：流畅的动画效果
export const drawAnimatedGhostBrush = (
  ctx: CanvasRenderingContext2D,
  mousePos: Position | null,
  mapCenter: Position,
  scale: number,
  pixelSize: number,
  canvasWidth: number,
  canvasHeight: number,
  brushSize: BrushSize,
  color: string,
  animationProgress: number // 0 到 1，用于动画效果
) => {
  if (!mousePos) return;
  
  ctx.save();
  
  // 苹果风格：优雅的淡入效果
  ctx.globalAlpha = easeInOutCubic(animationProgress);
  
  // 调用主绘制函数
  drawGhostBrush(ctx, mousePos, mapCenter, scale, pixelSize, 
                 canvasWidth, canvasHeight, brushSize, color);
  
  // 添加脉冲动画效果
  if (animationProgress > 0.8) {
    const pulseAlpha = (animationProgress - 0.8) * 5 * (1 - (animationProgress - 0.8) * 5);
    
    const halfWidth = canvasWidth / 2;
    const halfHeight = canvasHeight / 2;
    
    const offsetX = mousePos.x - halfWidth;
    const offsetY = mousePos.y - halfHeight;
    
    const worldX = (offsetX / scale) + mapCenter.x;
    const worldY = (offsetY / scale) + mapCenter.y;
    
    const gridX = Math.floor(worldX / pixelSize);
    const gridY = Math.floor(worldY / pixelSize);
    
    const startX = gridX - Math.floor(brushSize.width / 2);
    const startY = gridY - Math.floor(brushSize.height / 2);
    
    const screenX = (startX * pixelSize - mapCenter.x) * scale + halfWidth;
    const screenY = (startY * pixelSize - mapCenter.y) * scale + halfHeight;
    const screenWidth = brushSize.width * pixelSize * scale;
    const screenHeight = brushSize.height * pixelSize * scale;
    
    // 脉冲效果
    ctx.globalAlpha = pulseAlpha * 0.3;
    ctx.strokeStyle = hexToRgba(color, 0.7);
    ctx.lineWidth = Math.max(1, 2 / scale);
    
    const pulseSize = pulseAlpha * 4;
    ctx.strokeRect(
      screenX - pulseSize,
      screenY - pulseSize,
      screenWidth + pulseSize * 2,
      screenHeight + pulseSize * 2
    );
  }
  
  ctx.restore();
};

// 缓动函数（苹果风格）
const easeInOutCubic = (t: number): number => {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
};