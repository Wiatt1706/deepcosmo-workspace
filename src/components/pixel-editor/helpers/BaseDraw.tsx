import { Position } from "../_lib/validations";

// 根据期望像素间距选择“漂亮”的步长（...1, 2, 5 × 10^n）
const chooseNiceStep = (targetUnits: number) => {
  if (targetUnits <= 0 || !isFinite(targetUnits)) return 1;
  const exponent = Math.floor(Math.log10(targetUnits));
  const fraction = targetUnits / Math.pow(10, exponent);
  let niceFraction = 1;
  if (fraction < 1.5) niceFraction = 1;
  else if (fraction < 3.5) niceFraction = 2;
  else if (fraction < 7.5) niceFraction = 5;
  else niceFraction = 10;
  return niceFraction * Math.pow(10, exponent);
};

// 将世界坐标（以“单位”为尺度）转换为画布像素（dpr 空间内）
const worldToCanvas = (
  worldUnits: number,
  half: number,
  offset: number,
  scale: number,
  dpr: number,
  pixelSize: number
) => half - offset * dpr * scale + worldUnits * pixelSize * dpr * scale;

// 画布像素（dpr 空间内）转换为世界坐标（单位）
const canvasToWorld = (
  px: number,
  half: number,
  offset: number,
  scale: number,
  dpr: number,
  pixelSize: number
) => (px - half + offset * dpr * scale) / (pixelSize * dpr * scale);

const isApproximatelyInteger = (value: number, eps = 1e-9) => Math.abs(value - Math.round(value)) < eps;
const isMultiple = (value: number, step: number, eps = 1e-9) => isApproximatelyInteger(value / step, eps);

export const drawGrid = (
  ctx: CanvasRenderingContext2D,
  offsetPoint: Position,
  scale: number,
  pixelSize: number,
  canvasWidth: number,
  canvasHeight: number,
  rectSize?: number
) => {
  const dpr = window.devicePixelRatio;
  const halfWidth = (canvasWidth / 2) * dpr;
  const halfHeight = (canvasHeight / 2) * dpr;

  // 基于当前缩放自动选择主/次网格步长（世界单位）
  // 实用设计：确保网格间距在10-50像素之间，便于精确操作
  const targetGridPx = Math.max(10, Math.min(50, 20 / scale)); // 根据缩放动态调整
  const unitsPerMinor = chooseNiceStep(targetGridPx / (pixelSize * scale));
  const unitsPerMajor = unitsPerMinor * 10;
  const unitsPerMedium = unitsPerMinor * 5; // 中等网格线，便于快速定位
  const minorStepPx = unitsPerMinor * pixelSize * scale * dpr;
  const mediumStepPx = unitsPerMedium * pixelSize * scale * dpr;
  const majorStepPx = unitsPerMajor * pixelSize * scale * dpr;

  // 视图边界（像素空间）
  const leftPx = 0;
  const rightPx = canvasWidth * dpr;
  const topPx = 0;
  const bottomPx = canvasHeight * dpr;

  ctx.save();
  ctx.scale(1 / dpr, 1 / dpr);

  // 计算可选裁剪区域
  const centerX = halfWidth - offsetPoint.x * dpr * scale;
  const centerY = halfHeight - offsetPoint.y * dpr * scale;
  const rectHalfSize = rectSize ? (rectSize / 2) * dpr * scale : 0;
  if (rectSize) {
    ctx.strokeStyle = "rgba(0, 0, 0, 0.1)";
    ctx.lineWidth = 1 * dpr;
    ctx.strokeRect(
      centerX - rectHalfSize,
      centerY - rectHalfSize,
      rectSize * dpr * scale,
      rectSize * dpr * scale
    );

    ctx.save();
    ctx.beginPath();
    ctx.rect(
      centerX - rectHalfSize,
      centerY - rectHalfSize,
      rectSize * dpr * scale,
      rectSize * dpr * scale
    );
    ctx.clip();
  }

  // 以像素空间计算第一条线位置（与原点对齐）
  const originXPx = worldToCanvas(0, halfWidth, offsetPoint.x, scale, dpr, pixelSize);
  const originYPx = worldToCanvas(0, halfHeight, offsetPoint.y, scale, dpr, pixelSize);

  // 从视图左/上边界对应的世界坐标开始对齐到次网格刻度，避免负数取模带来的偏移
  const worldAtLeft = canvasToWorld(leftPx, halfWidth, offsetPoint.x, scale, dpr, pixelSize);
  const worldAtTop = canvasToWorld(topPx, halfHeight, offsetPoint.y, scale, dpr, pixelSize);
  const firstMinorWorldX = Math.floor(worldAtLeft / unitsPerMinor) * unitsPerMinor;
  const firstMinorWorldY = Math.floor(worldAtTop / unitsPerMinor) * unitsPerMinor;
  const firstMinorX = worldToCanvas(firstMinorWorldX, halfWidth, offsetPoint.x, scale, dpr, pixelSize);
  const firstMinorY = worldToCanvas(firstMinorWorldY, halfHeight, offsetPoint.y, scale, dpr, pixelSize);

  // 次网格 - 实用设计：始终显示，便于精确对齐
  ctx.strokeStyle = "#f3f4f6"; // 更淡的次网格线，减少视觉干扰
  ctx.lineWidth = 0.3 * dpr;
  ctx.beginPath();
  for (let x = firstMinorX; x <= rightPx; x += minorStepPx) {
    const drawX = Math.floor(x) + 0.5 * dpr;
    ctx.moveTo(drawX, rectSize ? centerY - rectHalfSize : topPx);
    ctx.lineTo(drawX, rectSize ? centerY + rectHalfSize : bottomPx);
  }
  for (let x = firstMinorX - minorStepPx; x >= leftPx; x -= minorStepPx) {
    const drawX = Math.floor(x) + 0.5 * dpr;
    ctx.moveTo(drawX, rectSize ? centerY - rectHalfSize : topPx);
    ctx.lineTo(drawX, rectSize ? centerY + rectHalfSize : bottomPx);
  }
  for (let y = firstMinorY; y <= bottomPx; y += minorStepPx) {
    const drawY = Math.floor(y) + 0.5 * dpr;
    ctx.moveTo(rectSize ? centerX - rectHalfSize : leftPx, drawY);
    ctx.lineTo(rectSize ? centerX + rectHalfSize : rightPx, drawY);
  }
  for (let y = firstMinorY - minorStepPx; y >= topPx; y -= minorStepPx) {
    const drawY = Math.floor(y) + 0.5 * dpr;
    ctx.moveTo(rectSize ? centerX - rectHalfSize : leftPx, drawY);
    ctx.lineTo(rectSize ? centerX + rectHalfSize : rightPx, drawY);
  }
  ctx.stroke();

  // 中等网格 - 实用设计：便于快速定位和测量
  const firstMediumWorldX = Math.floor(worldAtLeft / unitsPerMedium) * unitsPerMedium;
  const firstMediumWorldY = Math.floor(worldAtTop / unitsPerMedium) * unitsPerMedium;
  const firstMediumX = worldToCanvas(firstMediumWorldX, halfWidth, offsetPoint.x, scale, dpr, pixelSize);
  const firstMediumY = worldToCanvas(firstMediumWorldY, halfHeight, offsetPoint.y, scale, dpr, pixelSize);

  ctx.strokeStyle = "#e5e7eb"; // 更淡的中等网格线，减少视觉干扰
  ctx.lineWidth = 0.5 * dpr;
  ctx.beginPath();
  for (let x = firstMediumX; x <= rightPx; x += mediumStepPx) {
    const drawX = Math.floor(x) + 0.5 * dpr;
    ctx.moveTo(drawX, rectSize ? centerY - rectHalfSize : topPx);
    ctx.lineTo(drawX, rectSize ? centerY + rectHalfSize : bottomPx);
  }
  for (let x = firstMediumX - mediumStepPx; x >= leftPx; x -= mediumStepPx) {
    const drawX = Math.floor(x) + 0.5 * dpr;
    ctx.moveTo(drawX, rectSize ? centerY - rectHalfSize : topPx);
    ctx.lineTo(drawX, rectSize ? centerY + rectHalfSize : bottomPx);
  }
  for (let y = firstMediumY; y <= bottomPx; y += mediumStepPx) {
    const drawY = Math.floor(y) + 0.5 * dpr;
    ctx.moveTo(rectSize ? centerX - rectHalfSize : leftPx, drawY);
    ctx.lineTo(rectSize ? centerX + rectHalfSize : rightPx, drawY);
  }
  for (let y = firstMediumY - mediumStepPx; y >= topPx; y -= mediumStepPx) {
    const drawY = Math.floor(y) + 0.5 * dpr;
    ctx.moveTo(rectSize ? centerX - rectHalfSize : leftPx, drawY);
    ctx.lineTo(rectSize ? centerX + rectHalfSize : rightPx, drawY);
  }
  ctx.stroke();

  // 主网格 - 实用设计：清晰的主网格线，便于大范围定位
  ctx.strokeStyle = "#d1d5db"; // 更淡的主网格线，减少视觉干扰
  ctx.lineWidth = 0.8 * dpr;
  ctx.beginPath();
  const firstMajorWorldX = Math.floor(worldAtLeft / unitsPerMajor) * unitsPerMajor;
  const firstMajorWorldY = Math.floor(worldAtTop / unitsPerMajor) * unitsPerMajor;
  const firstMajorX = worldToCanvas(firstMajorWorldX, halfWidth, offsetPoint.x, scale, dpr, pixelSize);
  const firstMajorY = worldToCanvas(firstMajorWorldY, halfHeight, offsetPoint.y, scale, dpr, pixelSize);
  for (let x = firstMajorX; x <= rightPx; x += majorStepPx) {
    const drawX = Math.floor(x) + 0.5 * dpr;
    ctx.moveTo(drawX, rectSize ? centerY - rectHalfSize : topPx);
    ctx.lineTo(drawX, rectSize ? centerY + rectHalfSize : bottomPx);
  }
  for (let x = firstMajorX - majorStepPx; x >= leftPx; x -= majorStepPx) {
    const drawX = Math.floor(x) + 0.5 * dpr;
    ctx.moveTo(drawX, rectSize ? centerY - rectHalfSize : topPx);
    ctx.lineTo(drawX, rectSize ? centerY + rectHalfSize : bottomPx);
  }
  for (let y = firstMajorY; y <= bottomPx; y += majorStepPx) {
    const drawY = Math.floor(y) + 0.5 * dpr;
    ctx.moveTo(rectSize ? centerX - rectHalfSize : leftPx, drawY);
    ctx.lineTo(rectSize ? centerX + rectHalfSize : rightPx, drawY);
  }
  for (let y = firstMajorY - majorStepPx; y >= topPx; y -= majorStepPx) {
    const drawY = Math.floor(y) + 0.5 * dpr;
    ctx.moveTo(rectSize ? centerX - rectHalfSize : leftPx, drawY);
    ctx.lineTo(rectSize ? centerX + rectHalfSize : rightPx, drawY);
  }
  ctx.stroke();

  // 坐标轴 - 实用设计：清晰的坐标轴，便于定位原点
  ctx.strokeStyle = "#9ca3af"; // 更淡的轴线颜色，减少视觉干扰
  ctx.lineWidth = 1.5 * dpr;
  ctx.beginPath();
  // Y 轴（x = 0）
  const yAxisX = Math.floor(originXPx) + 0.5 * dpr;
  ctx.moveTo(yAxisX, rectSize ? centerY - rectHalfSize : topPx);
  ctx.lineTo(yAxisX, rectSize ? centerY + rectHalfSize : bottomPx);
  // X 轴（y = 0）
  const xAxisY = Math.floor(originYPx) + 0.5 * dpr;
  ctx.moveTo(rectSize ? centerX - rectHalfSize : leftPx, xAxisY);
  ctx.lineTo(rectSize ? centerX + rectHalfSize : rightPx, xAxisY);
  ctx.stroke();

  // 原点十字 - 实用设计：清晰可见的原点标记
  ctx.fillStyle = "#374151";
  const crossSize = 4 * dpr;
  // 绘制清晰的原点十字
  ctx.fillRect(originXPx - crossSize, originYPx - 1 * dpr, 2 * crossSize, 2 * dpr);
  ctx.fillRect(originXPx - 1 * dpr, originYPx - crossSize, 2 * dpr, 2 * crossSize);

  // 添加白色边框使十字更突出
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 1 * dpr;
  ctx.strokeRect(originXPx - crossSize, originYPx - 1 * dpr, 2 * crossSize, 2 * dpr);
  ctx.strokeRect(originXPx - 1 * dpr, originYPx - crossSize, 2 * dpr, 2 * crossSize);

  if (rectSize) {
    ctx.restore();
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
) => {
  const dpr = window.devicePixelRatio;
  const halfWidth = (canvasWidth / 2) * dpr;
  const halfHeight = (canvasHeight / 2) * dpr;

  // 与网格一致的步长
  const desiredMinorPx = 8;
  const unitsPerMinor = chooseNiceStep(desiredMinorPx / (pixelSize * scale));
  const unitsPerMedium = unitsPerMinor * 5;
  const unitsPerMajor = unitsPerMinor * 10;
  const minorStepPx = unitsPerMinor * pixelSize * scale * dpr;

  ctx.save();
  ctx.scale(1 / dpr, 1 / dpr);

  // 背景与边框 - 实用设计：清晰的标尺背景
  ctx.fillStyle = "#f8fafc"; // 浅色背景，便于阅读刻度
  ctx.fillRect(0, 0, canvasWidth * dpr, 20 * dpr);
  ctx.fillRect(0, 0, 20 * dpr, canvasHeight * dpr);

  // 添加边框分隔线
  ctx.strokeStyle = "#d1d5db";
  ctx.lineWidth = 1 * dpr;
  ctx.beginPath();
  ctx.moveTo(20 * dpr, 0);
  ctx.lineTo(20 * dpr, canvasHeight * dpr);
  ctx.moveTo(0, 20 * dpr);
  ctx.lineTo(canvasWidth * dpr, 20 * dpr);
  ctx.stroke();

  // X 轴刻度
  const drawXTicks = () => {
    const leftPx = 0;
    const rightPx = canvasWidth * dpr;
    // 使用世界-像素转换对齐，避免负数取模与累积误差
    const worldAtLeft = canvasToWorld(leftPx, halfWidth, offsetPoint.x, scale, dpr, pixelSize);
    const firstMinorWorld = Math.floor(worldAtLeft / unitsPerMinor) * unitsPerMinor;
    const firstMinor = worldToCanvas(firstMinorWorld, halfWidth, offsetPoint.x, scale, dpr, pixelSize);
    ctx.strokeStyle = "#6b7280"; // 清晰的刻度线
    ctx.fillStyle = "#374151"; // 清晰的文字颜色
    ctx.font = `${9 * dpr}px 'Consolas', 'Monaco', monospace`; // 等宽字体，便于精确读数

    for (let x = firstMinor; x <= rightPx; x += minorStepPx) {
      const worldUnits = canvasToWorld(x, halfWidth, offsetPoint.x, scale, dpr, pixelSize);
      const labelUnits = Math.round(worldUnits / unitsPerMinor) * unitsPerMinor;
      const isMajor = isMultiple(labelUnits, unitsPerMajor);
      const isMedium = !isMajor && isMultiple(labelUnits, unitsPerMedium);
      const tickLen = isMajor ? 12 : isMedium ? 8 : 4;
      const drawX = Math.floor(x) + 0.5 * dpr;
      ctx.beginPath();
      ctx.moveTo(drawX, 20 * dpr);
      ctx.lineTo(drawX, (20 - tickLen) * dpr);
      ctx.stroke();
      if (isMajor && x > 30 * dpr) {
        const decimals = Math.max(0, -Math.floor(Math.log10(unitsPerMajor)));
        const label = labelUnits.toFixed(decimals);
        ctx.fillText(label, drawX + 2 * dpr, 14 * dpr);
      }
    }
    for (let x = firstMinor - minorStepPx; x >= leftPx; x -= minorStepPx) {
      const worldUnits = canvasToWorld(x, halfWidth, offsetPoint.x, scale, dpr, pixelSize);
      const labelUnits = Math.round(worldUnits / unitsPerMinor) * unitsPerMinor;
      const isMajor = isMultiple(labelUnits, unitsPerMajor);
      const isMedium = !isMajor && isMultiple(labelUnits, unitsPerMedium);
      const tickLen = isMajor ? 12 : isMedium ? 8 : 4;
      const drawX = Math.floor(x) + 0.5 * dpr;
      ctx.beginPath();
      ctx.moveTo(drawX, 20 * dpr);
      ctx.lineTo(drawX, (20 - tickLen) * dpr);
      ctx.stroke();
      if (isMajor && x > 30 * dpr) {
        const decimals = Math.max(0, -Math.floor(Math.log10(unitsPerMajor)));
        const label = labelUnits.toFixed(decimals);
        ctx.fillText(label, drawX + 2 * dpr, 14 * dpr);
      }
    }
  };

  // Y 轴刻度
  const drawYTicks = () => {
    const topPx = 0;
    const bottomPx = canvasHeight * dpr;
    const worldAtTop = canvasToWorld(topPx, halfHeight, offsetPoint.y, scale, dpr, pixelSize);
    const firstMinorWorld = Math.floor(worldAtTop / unitsPerMinor) * unitsPerMinor;
    const firstMinor = worldToCanvas(firstMinorWorld, halfHeight, offsetPoint.y, scale, dpr, pixelSize);
    ctx.strokeStyle = "#6b7280"; // 清晰的刻度线
    ctx.fillStyle = "#374151"; // 清晰的文字颜色
    ctx.font = `${9 * dpr}px 'Consolas', 'Monaco', monospace`; // 等宽字体，便于精确读数

    for (let y = firstMinor; y <= bottomPx; y += minorStepPx) {
      const worldUnits = canvasToWorld(y, halfHeight, offsetPoint.y, scale, dpr, pixelSize);
      const labelUnits = Math.round(worldUnits / unitsPerMinor) * unitsPerMinor;
      const isMajor = isMultiple(labelUnits, unitsPerMajor);
      const isMedium = !isMajor && isMultiple(labelUnits, unitsPerMedium);
      const tickLen = isMajor ? 14 : isMedium ? 10 : 6;
      const drawY = Math.floor(y) + 0.5 * dpr;
      ctx.beginPath();
      ctx.moveTo(20 * dpr, drawY);
      ctx.lineTo((20 - tickLen) * dpr, drawY);
      ctx.stroke();
      if (isMajor && y > 30 * dpr) {
        ctx.save();
        ctx.translate(16 * dpr, drawY);
        ctx.rotate(-Math.PI / 2);
        const decimals = Math.max(0, -Math.floor(Math.log10(unitsPerMajor)));
        const label = labelUnits.toFixed(decimals);
        ctx.fillText(label, 2 * dpr, -4 * dpr);
        ctx.restore();
      }
    }
    for (let y = firstMinor - minorStepPx; y >= topPx; y -= minorStepPx) {
      const worldUnits = canvasToWorld(y, halfHeight, offsetPoint.y, scale, dpr, pixelSize);
      const labelUnits = Math.round(worldUnits / unitsPerMinor) * unitsPerMinor;
      const isMajor = isMultiple(labelUnits, unitsPerMajor);
      const isMedium = !isMajor && isMultiple(labelUnits, unitsPerMedium);
      const tickLen = isMajor ? 14 : isMedium ? 10 : 6;
      const drawY = Math.floor(y) + 0.5 * dpr;
      ctx.beginPath();
      ctx.moveTo(20 * dpr, drawY);
      ctx.lineTo((20 - tickLen) * dpr, drawY);
      ctx.stroke();
      if (isMajor && y > 30 * dpr) {
        ctx.save();
        ctx.translate(20 * dpr, drawY);
        ctx.rotate(-Math.PI / 2);
        const decimals = Math.max(0, -Math.floor(Math.log10(unitsPerMajor)));
        const label = labelUnits.toFixed(decimals);
        ctx.fillText(label, 2 * dpr, -4 * dpr);
        ctx.restore();
      }
    }
  };

  drawXTicks();
  drawYTicks();

  // 绘制鼠标位置跟踪线
  if (mousePosition) {
    const dpr = window.devicePixelRatio;
    const mouseX = mousePosition.x * dpr;
    const mouseY = mousePosition.y * dpr;

    // 绘制垂直跟踪线 - 实用设计：清晰的跟踪线
    ctx.strokeStyle = "#3b82f6"; // 红色跟踪线，更醒目
    ctx.lineWidth = 1 * dpr;
    ctx.setLineDash([4 * dpr, 4 * dpr]); // 清晰的虚线
    ctx.beginPath();
    ctx.moveTo(mouseX, 20 * dpr);
    ctx.lineTo(mouseX, canvasHeight * dpr);
    ctx.stroke();

    // 绘制水平跟踪线
    ctx.beginPath();
    ctx.moveTo(20 * dpr, mouseY);
    ctx.lineTo(canvasWidth * dpr, mouseY);
    ctx.stroke();

    // 重置线条样式
    ctx.setLineDash([]);

    // 在标尺上显示鼠标位置坐标
    const worldX = canvasToWorld(mouseX, halfWidth, offsetPoint.x, scale, dpr, pixelSize);
    const worldY = canvasToWorld(mouseY, halfHeight, offsetPoint.y, scale, dpr, pixelSize);

    // 在X轴标尺上显示Y坐标 - 实用设计：清晰的坐标显示
    if (mouseY > 20 * dpr && mouseY < canvasHeight * dpr) {
      ctx.fillStyle = "#fef3c7"; // 黄色背景，更醒目
      ctx.font = `${8 * dpr}px 'Consolas', 'Monaco', monospace`;
      const yLabel = worldY.toFixed(2);
      const textWidth = ctx.measureText(yLabel).width;
      ctx.fillRect(mouseX - textWidth / 2 - 2 * dpr, 2 * dpr, textWidth + 4 * dpr, 12 * dpr);
      ctx.fillStyle = "#92400e";
      ctx.fillText(yLabel, mouseX - textWidth / 2, 10 * dpr);
    }

    // 在Y轴标尺上显示X坐标 - 实用设计：清晰的坐标显示
    if (mouseX > 20 * dpr && mouseX < canvasWidth * dpr) {
      ctx.fillStyle = "#fef3c7"; // 黄色背景，更醒目
      ctx.font = `${8 * dpr}px 'Consolas', 'Monaco', monospace`;
      const xLabel = worldX.toFixed(2);
      const textWidth = ctx.measureText(xLabel).width;
      ctx.fillRect(2 * dpr, mouseY - 6 * dpr, textWidth + 4 * dpr, 12 * dpr);
      ctx.fillStyle = "#92400e";
      ctx.fillText(xLabel, 4 * dpr, mouseY + 2 * dpr);
    }
  }

  ctx.restore();
};

