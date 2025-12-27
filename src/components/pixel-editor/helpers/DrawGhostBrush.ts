// helpers/DrawGhostBrush.ts
import { Position } from "../_lib/validations";

interface BrushSize {
  width: number;
  height: number;
}

// Apple Design Constants
const CONSTANTS = {
  LABEL_BG: 'rgba(30, 30, 30, 0.85)', // 深色磨砂感背景
  LABEL_TEXT: '#FFFFFF',
  BORDER_ACCENT: 'rgba(255, 255, 255, 0.9)', // 高亮边框
  BORDER_SHADOW: 'rgba(0, 0, 0, 0.3)', // 深色投影边框，保证在白色背景可见
  GRID_LINE: 'rgba(255, 255, 255, 0.2)',
  CORNER_RADIUS: 4,
};

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

  // 1. 基础坐标计算
  const halfWidth = canvasWidth / 2;
  const halfHeight = canvasHeight / 2;
  
  const offsetX = mousePos.x - halfWidth;
  const offsetY = mousePos.y - halfHeight;

  // 将屏幕坐标转换为世界坐标
  const worldX = (offsetX / scale) + mapCenter.x;
  const worldY = (offsetY / scale) + mapCenter.y;

  // 对齐网格
  const gridX = Math.floor(worldX / pixelSize);
  const gridY = Math.floor(worldY / pixelSize);

  // 计算笔刷起始网格
  const startX = gridX - Math.floor(brushSize.width / 2);
  const startY = gridY - Math.floor(brushSize.height / 2);

  // 转换回屏幕坐标用于绘制
  const screenX = (startX * pixelSize - mapCenter.x) * scale + halfWidth;
  const screenY = (startY * pixelSize - mapCenter.y) * scale + halfHeight;
  const screenW = brushSize.width * pixelSize * scale;
  const screenH = brushSize.height * pixelSize * scale;

  ctx.save();

  // 2. 绘制逻辑分层
  
  // A. 填充层：极淡的色彩暗示 (Subtle Tint)
  drawTintBackground(ctx, screenX, screenY, screenW, screenH, color);

  // B. 网格层：仅当笔刷较大时显示内部网格 (Internal Grid)
  if (brushSize.width > 1 || brushSize.height > 1) {
    drawPixelGrid(ctx, screenX, screenY, screenW, screenH, brushSize.width, brushSize.height, scale);
  }

  // C. 边框层：双色高对比度边框 (Focus Ring)
  drawFocusBorder(ctx, screenX, screenY, screenW, screenH, scale);

  // D. 智能指示器层：自适应位置标签 (Smart Label)
  // 只有非 1x1 笔刷才显示尺寸
  if (brushSize.width > 1 || brushSize.height > 1) {
    drawSmartLabel(ctx, screenX, screenY, screenW, screenH, brushSize, scale, canvasWidth, canvasHeight);
  }

  ctx.restore();
};

// --- 子绘制函数 ---

const drawTintBackground = (
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
  color: string
) => {
  ctx.fillStyle = hexToRgba(color, 0.15); // 保持极低透明度
  ctx.fillRect(x, y, w, h);
};

const drawPixelGrid = (
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
  cols: number, rows: number,
  scale: number
) => {
  // 当缩放太小时，隐藏内部网格以避免杂乱
  if (scale < 0.5) return;

  const cellW = w / cols;
  const cellH = h / rows;

  ctx.beginPath();
  ctx.strokeStyle = CONSTANTS.GRID_LINE;
  // 保持线宽一致，不随缩放变粗，但要有最小值
  ctx.lineWidth = Math.max(0.5, 1 / scale); 

  // 绘制垂直线
  for (let i = 1; i < cols; i++) {
    const lx = x + i * cellW;
    ctx.moveTo(lx, y);
    ctx.lineTo(lx, y + h);
  }
  // 绘制水平线
  for (let i = 1; i < rows; i++) {
    const ly = y + i * cellH;
    ctx.moveTo(x, ly);
    ctx.lineTo(x + w, ly);
  }
  ctx.stroke();
};

const drawFocusBorder = (
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
  scale: number
) => {
  const lw = Math.max(1, 2 / scale); // 边框宽度
  
  // 1. 外部深色描边（阴影/对比层）- 也就是 "Outer Glow" 的收敛版
  ctx.strokeStyle = CONSTANTS.BORDER_SHADOW;
  ctx.lineWidth = lw + (2 / scale); // 稍宽一点
  ctx.strokeRect(x - (1 / scale), y - (1 / scale), w + (2 / scale), h + (2 / scale));

  // 2. 内部亮色主描边 - 也就是 "Focus Ring"
  ctx.strokeStyle = CONSTANTS.BORDER_ACCENT;
  ctx.lineWidth = lw;
  ctx.strokeRect(x, y, w, h);
  
  // 3. 四角强化 (Corner Accents) - 类似相机的对焦框
  const cornerLen = Math.min(w, h) * 0.2;
  if (cornerLen > 4) {
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = lw * 1.5;
    ctx.beginPath();
    
    // 左上
    ctx.moveTo(x, y + cornerLen);
    ctx.lineTo(x, y);
    ctx.lineTo(x + cornerLen, y);
    
    // 右上
    ctx.moveTo(x + w - cornerLen, y);
    ctx.lineTo(x + w, y);
    ctx.lineTo(x + w, y + cornerLen);
    
    // 右下
    ctx.moveTo(x + w, y + h - cornerLen);
    ctx.lineTo(x + w, y + h);
    ctx.lineTo(x + w - cornerLen, y + h);
    
    // 左下
    ctx.moveTo(x + cornerLen, y + h);
    ctx.lineTo(x, y + h);
    ctx.lineTo(x, y + h - cornerLen);
    
    ctx.stroke();
  }
};

/**
 * 核心改进：智能尺寸指示器
 * 1. 边界检测：防止绘制在画布外
 * 2. 胶囊样式：Apple UI 风格
 * 3. 字体渲染优化
 */
const drawSmartLabel = (
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
  brushSize: BrushSize,
  scale: number,
  canvasW: number, canvasH: number
) => {
  const text = `${brushSize.width} × ${brushSize.height}`;
  
  // 字体配置：使用系统字体栈，保证清晰
  const fontSize = 12; // 这种 UI 元素通常不需要随缩放大幅改变大小，固定像素更清晰
  ctx.font = `600 ${fontSize}px -apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif`;
  
  const metrics = ctx.measureText(text);
  const textW = metrics.width;
  const paddingX = 8;
  const paddingY = 4;
  const pillW = textW + paddingX * 2;
  const pillH = fontSize + paddingY * 2;
  
  const gap = 8; // 标签距离笔刷的间隙

  // --- 智能位置计算 (Collision Logic) ---
  
  // 默认：居中显示在笔刷下方
  let labelX = x + w / 2 - pillW / 2;
  let labelY = y + h + gap;

  // 1. 底部边界检测：如果下方空间不足，移到上方
  if (labelY + pillH > canvasH) {
    labelY = y - gap - pillH;
  }
  
  // 2. 顶部边界检测：如果移到上方后还是超出（比如笔刷比屏幕还大），尝试放内部底部
  if (labelY < 0) {
    labelY = y + h - pillH - gap; 
    // 极端情况：笔刷内部底部也被遮挡（非常少见），则强制显示在屏幕顶部
    if (labelY + pillH > canvasH) labelY = canvasH - pillH - gap;
  }

  // 3. 左右边界检测
  if (labelX < 0) labelX = gap; // 贴左边
  if (labelX + pillW > canvasW) labelX = canvasW - pillW - gap; // 贴右边

  // --- 绘制胶囊 (Pill) ---
  
  ctx.beginPath();
  drawRoundedRectPath(ctx, labelX, labelY, pillW, pillH, 4);
  
  // 背景阴影（提升层次感）
  ctx.shadowColor = 'rgba(0,0,0,0.2)';
  ctx.shadowBlur = 6;
  ctx.shadowOffsetY = 2;
  
  ctx.fillStyle = CONSTANTS.LABEL_BG;
  ctx.fill();
  
  // 清除阴影，准备绘制文字
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  // 文字
  ctx.fillStyle = CONSTANTS.LABEL_TEXT;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';
  // +1 用于视觉上的垂直居中修正
  ctx.fillText(text, labelX + pillW / 2, labelY + pillH / 2 + 1); 
};

// 辅助：绘制圆角矩形路径
const drawRoundedRectPath = (
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number
) => {
  if (w < 2 * r) r = w / 2;
  if (h < 2 * r) r = h / 2;
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
};

const hexToRgba = (hex: string, alpha: number): string => {
  const cleanHex = hex.replace('#', '');
  const r = parseInt(cleanHex.substring(0, 2), 16);
  const g = parseInt(cleanHex.substring(2, 4), 16);
  const b = parseInt(cleanHex.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};