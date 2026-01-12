// src/engine/core/Camera.ts
import { Vec2 } from '../types';

// [FIX] 移除旧的 lerp，它是不正确的。我们将在 update 中使用基于时间的阻尼公式。

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
  private maxZoom: number = 1000.0;
  
  // [FIX] 调整 Damping 系数。
  // 之前是 0.15 (每帧)，现在我们需要一个每秒的衰减系数。
  // 约等于：每秒移动剩余距离的 90% (值越大越快)
  private dampingSpeed: number = 10.0; 

  resize(w: number, h: number) {
    this.viewportW = w;
    this.viewportH = h;
  }

  // [FIX] 接收 delta time (秒)
  update(dt: number) {
    // 1. Zoom 插值 (使用指数衰减公式，帧率无关)
    // Formula: value = target + (current - target) * e^(-speed * dt)
    if (Math.abs(this.targetZoom - this.zoom) > 0.0001 * this.zoom) {
         const t = 1.0 - Math.exp(-this.dampingSpeed * dt);
         this.zoom = this.zoom + (this.targetZoom - this.zoom) * t;
    } else {
         this.zoom = this.targetZoom;
    }

    // 2. Position 插值
    // [FIX] 增加更平滑的阈值判断
    const dist = Math.abs(this.targetX - this.x) + Math.abs(this.targetY - this.y);
    if (dist > 0.1) {
         const t = 1.0 - Math.exp(-this.dampingSpeed * dt);
         this.x = this.x + (this.targetX - this.x) * t;
         this.y = this.y + (this.targetY - this.y) * t;
    } else {
         this.x = this.targetX;
         this.y = this.targetY;
    }
  }

  screenToWorld(sx: number, sy: number): Vec2 {
    return {
      x: (sx - this.viewportW / 2) / this.zoom + this.x,
      y: (sy - this.viewportH / 2) / this.zoom + this.y,
    };
  }

  private screenToWorldTarget(sx: number, sy: number): Vec2 {
    return {
      x: (sx - this.viewportW / 2) / this.targetZoom + this.targetX,
      y: (sy - this.viewportH / 2) / this.targetZoom + this.targetY,
    };
  }

  zoomBy(factor: number, centerScreenX?: number, centerScreenY?: number) {
    const cx = centerScreenX ?? this.viewportW / 2;
    const cy = centerScreenY ?? this.viewportH / 2;
    
    // 基于当前的目标状态计算，确保快速滚动时的连续性
    const worldPosBefore = this.screenToWorldTarget(cx, cy);

    const newZoom = Math.max(this.minZoom, Math.min(this.maxZoom, this.targetZoom * factor));
    if (Math.abs(newZoom - this.targetZoom) < 0.00001) return;
    this.targetZoom = newZoom;

    // 反推目标位置，保持鼠标指向点不变
    this.targetX = worldPosBefore.x - (cx - this.viewportW / 2) / this.targetZoom;
    this.targetY = worldPosBefore.y - (cy - this.viewportH / 2) / this.targetZoom;
  }
  
  panBy(screenDx: number, screenDy: number) {
      this.targetX -= screenDx / this.zoom; 
      this.targetY -= screenDy / this.zoom;
  }

  teleport(x: number, y: number, zoom: number) {
      this.x = this.targetX = x;
      this.y = this.targetY = y;
      this.zoom = this.targetZoom = zoom;
  }

  panToSmooth(worldX: number, worldY: number) {
      this.targetX = worldX;
      this.targetY = worldY;
  }

  getVisibleBounds(buffer: number = 0) {
    const tl = this.screenToWorld(0, 0);
    const br = this.screenToWorld(this.viewportW, this.viewportH);
    // [FIX] Zoom padding 应该基于视口大小动态调整，防止无限缩放时计算错误
    const zoomPadding = 100 / this.zoom; 
    return { 
      left: Math.min(tl.x, br.x) - zoomPadding - buffer, 
      top: Math.min(tl.y, br.y) - zoomPadding - buffer, 
      right: Math.max(tl.x, br.x) + zoomPadding + buffer, 
      bottom: Math.max(tl.y, br.y) + zoomPadding + buffer 
    };
  }
}