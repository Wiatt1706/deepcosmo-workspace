// src/engine/core/Camera.ts
import { Vec2 } from '../types';

const lerp = (start: number, end: number, t: number) => {
  return start * (1 - t) + end * t;
};

export class Camera {
  public x: number = 0;
  public y: number = 0;
  public zoom: number = 1;
  
  // 物理目标值
  private targetX: number = 0;
  private targetY: number = 0;
  private targetZoom: number = 1;

  private viewportW: number = 0;
  private viewportH: number = 0;
  
  private minZoom: number = 0.05; 
  private maxZoom: number = 1000.0; // 提高上限，允许深度探索
  private damping: number = 0.15; 

  resize(w: number, h: number) {
    this.viewportW = w;
    this.viewportH = h;
  }

  update() {
    // Zoom 插值
    if (Math.abs(this.targetZoom - this.zoom) < 0.0001) {
        this.zoom = this.targetZoom;
    } else {
        this.zoom = lerp(this.zoom, this.targetZoom, this.damping);
    }

    // Position 插值
    if (Math.abs(this.targetX - this.x) < 0.1 && Math.abs(this.targetY - this.y) < 0.1) {
        this.x = this.targetX;
        this.y = this.targetY;
    } else {
        this.x = lerp(this.x, this.targetX, this.damping);
        this.y = lerp(this.y, this.targetY, this.damping);
    }
  }

  screenToWorld(sx: number, sy: number): Vec2 {
    return {
      x: (sx - this.viewportW / 2) / this.zoom + this.x,
      y: (sy - this.viewportH / 2) / this.zoom + this.y,
    };
  }

  // 获取基于目标值的世界坐标，用于连续滚轮缩放计算
  private screenToWorldTarget(sx: number, sy: number): Vec2 {
    return {
      x: (sx - this.viewportW / 2) / this.targetZoom + this.targetX,
      y: (sy - this.viewportH / 2) / this.targetZoom + this.targetY,
    };
  }

  zoomBy(factor: number, centerScreenX?: number, centerScreenY?: number) {
    const cx = centerScreenX ?? this.viewportW / 2;
    const cy = centerScreenY ?? this.viewportH / 2;
    
    const worldPosBefore = this.screenToWorldTarget(cx, cy);

    const newZoom = Math.max(this.minZoom, Math.min(this.maxZoom, this.targetZoom * factor));
    if (newZoom === this.targetZoom) return;
    this.targetZoom = newZoom;

    // 反推目标位置，保持鼠标指向点不变
    this.targetX = worldPosBefore.x - (cx - this.viewportW / 2) / this.targetZoom;
    this.targetY = worldPosBefore.y - (cy - this.viewportH / 2) / this.targetZoom;
  }
  
  panBy(screenDx: number, screenDy: number) {
      this.targetX -= screenDx / this.zoom; 
      this.targetY -= screenDy / this.zoom;
  }

  /**
   * [New] 瞬间传送 (用于世界切换)
   * 必须同时重置 current 和 target，否则物理 update 会把摄像机拉回去
   */
  teleport(x: number, y: number, zoom: number) {
      this.x = this.targetX = x;
      this.y = this.targetY = y;
      this.zoom = this.targetZoom = zoom;
  }

  /**
   * [New] 平滑移动到某点 (用于点击查看详情)
   */
  panToSmooth(worldX: number, worldY: number) {
      this.targetX = worldX;
      this.targetY = worldY;
  }

  getVisibleBounds(buffer: number = 0) {
    const tl = this.screenToWorld(0, 0);
    const br = this.screenToWorld(this.viewportW, this.viewportH);
    const zoomPadding = 100 / this.zoom; 
    return { 
      left: Math.min(tl.x, br.x) - zoomPadding - buffer, 
      top: Math.min(tl.y, br.y) - zoomPadding - buffer, 
      right: Math.max(tl.x, br.x) + zoomPadding + buffer, 
      bottom: Math.max(tl.y, br.y) + zoomPadding + buffer 
    };
  }
}