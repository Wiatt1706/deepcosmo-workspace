// src/engine/core/Camera.ts
import { Vec2 } from '../types';

export class Camera {
  public x: number = 0;
  public y: number = 0;
  public zoom: number = 1;
  
  // 私有属性保持私有
  private targetX: number = 0;
  private targetY: number = 0;
  private targetZoom: number = 1;

  private viewportW: number = 0;
  private viewportH: number = 0;
  
  private minZoom: number = 0.05; 
  private maxZoom: number = 1000.0;
  private dampingSpeed: number = 10.0; 

  resize(w: number, h: number) {
    this.viewportW = w;
    this.viewportH = h;
  }

  update(dt: number) {
    // 1. Zoom 插值
    if (Math.abs(this.targetZoom - this.zoom) > 0.0001 * this.zoom) {
          const t = 1.0 - Math.exp(-this.dampingSpeed * dt);
          this.zoom = this.zoom + (this.targetZoom - this.zoom) * t;
    } else {
          this.zoom = this.targetZoom;
    }

    // 2. Position 插值
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

  // [New] 公开查询方法：判断相机是否正在运动
  // 解决 Engine 无法访问私有属性的问题
  public isMoving(): boolean {
      const epsilon = 0.01;
      const zoomEpsilon = 0.0001;
      
      return Math.abs(this.targetX - this.x) > epsilon ||
             Math.abs(this.targetY - this.y) > epsilon ||
             Math.abs(this.targetZoom - this.zoom) > zoomEpsilon;
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
    
    const worldPosBefore = this.screenToWorldTarget(cx, cy);

    let newZoom = this.targetZoom * factor;
    newZoom = Math.max(this.minZoom, Math.min(this.maxZoom, newZoom));
    
    if (Math.abs(newZoom - this.targetZoom) < 0.000001) return;
    
    this.targetZoom = newZoom;

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
    const zoomPadding = 100 / this.zoom; 
    return { 
      left: Math.min(tl.x, br.x) - zoomPadding - buffer, 
      top: Math.min(tl.y, br.y) - zoomPadding - buffer, 
      right: Math.max(tl.x, br.x) + zoomPadding + buffer, 
      bottom: Math.max(tl.y, br.y) + zoomPadding + buffer 
    };
  }
}