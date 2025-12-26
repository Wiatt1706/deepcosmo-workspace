// helpers/DrawGhostBrush.ts
import { Position } from "../_lib/validations";

interface BrushSize {
  width: number;
  height: number;
}

export const drawGhostBrush = (
  ctx: CanvasRenderingContext2D,
  mousePos: Position | null,
  mapCenter: Position,
  scale: number,
  pixelSize: number,
  canvasWidth: number, // 逻辑宽度 (CSS pixels)
  canvasHeight: number, // 逻辑高度 (CSS pixels)
  brushSize: BrushSize,
  color: string
) => {
  if (!mousePos) return;

  const dpr = window.devicePixelRatio || 1;
  
  // 1. 计算鼠标当前对应的“世界网格坐标”
  // ----------------------------------------------------
  // 公式逆推：从屏幕坐标 -> 世界坐标
  const halfWidth = canvasWidth / 2;
  const halfHeight = canvasHeight / 2;
  
  // 鼠标相对于画布中心的偏移
  const offsetX = mousePos.x - halfWidth;
  const offsetY = mousePos.y - halfHeight;

  // 转换为世界坐标 (World Units)
  const worldX = (offsetX / scale) + mapCenter.x;
  const worldY = (offsetY / scale) + mapCenter.y;

  // 转换为网格索引 (Grid Index)
  const gridX = Math.floor(worldX / pixelSize);
  const gridY = Math.floor(worldY / pixelSize);

  // 2. 根据笔刷大小计算起始点 (Centering Logic)
  // ----------------------------------------------------
  // 逻辑需与 useEditorStore 中的 addPixel 保持完全一致
  const startX = gridX - Math.floor(brushSize.width / 2);
  const startY = gridY - Math.floor(brushSize.height / 2);

  // 3. 设置绘制样式
  // ----------------------------------------------------
  ctx.save();
  ctx.globalAlpha = 0.5; // 半透明填充
  ctx.fillStyle = color;
  
  // 边框样式 (可选，为了在深色背景看清黑色笔刷)
  ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
  ctx.lineWidth = 1 / scale; // 保持边框细线，不随缩放变粗

  // 4. 循环绘制笔刷覆盖的每个格子
  // ----------------------------------------------------
  // 注意：这里我们遍历笔刷覆盖的网格，然后将每个网格转换回屏幕坐标进行绘制
  for (let i = 0; i < brushSize.width; i++) {
    for (let j = 0; j < brushSize.height; j++) {
      const currentGridX = startX + i;
      const currentGridY = startY + j;

      // 世界坐标 -> 屏幕坐标 (Drawing Coords)
      // ScreenX = (GridX * PixelSize - MapCenterX) * Scale + HalfWidth
      const screenX = (currentGridX * pixelSize - mapCenter.x) * scale + halfWidth;
      const screenY = (currentGridY * pixelSize - mapCenter.y) * scale + halfHeight;
      
      const size = pixelSize * scale;

      // 绘制填充
      ctx.fillRect(screenX, screenY, size, size);
      
      // 绘制边框 (让大笔刷看起来是一个整体，或者每个格子都有边框，这里演示每个格子)
      ctx.strokeRect(screenX, screenY, size, size);
    }
  }

  // 绘制一个整体的外边框（可选：如果你希望看起来像一个大方块而不是多个小方块，用这段代码代替上面的 strokeRect）
  /*
  const totalScreenX = (startX * pixelSize - mapCenter.x) * scale + halfWidth;
  const totalScreenY = (startY * pixelSize - mapCenter.y) * scale + halfHeight;
  ctx.strokeRect(
     totalScreenX, 
     totalScreenY, 
     brushSize.width * pixelSize * scale, 
     brushSize.height * pixelSize * scale
  );
  */

  ctx.restore();
};