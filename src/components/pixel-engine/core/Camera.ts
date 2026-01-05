// src/engine/core/Camera.ts
import { Vec2 } from '../types';

export class Camera {
  public x: number = 0;
  public y: number = 0;
  public zoom: number = 1;
  
  private viewportW: number = 0;
  private viewportH: number = 0;
  
  // 缩放限制
  private minZoom: number = 0.1;
  private maxZoom: number = 50.0;

  resize(w: number, h: number) {
    this.viewportW = w;
    this.viewportH = h;
  }

  screenToWorld(sx: number, sy: number): Vec2 {
    return {
      x: (sx - this.viewportW / 2) / this.zoom + this.x,
      y: (sy - this.viewportH / 2) / this.zoom + this.y,
    };
  }

  // 基于屏幕中心点的缩放 (符合商业软件手感)
  zoomBy(factor: number, centerScreenX?: number, centerScreenY?: number) {
    const cx = centerScreenX ?? this.viewportW / 2;
    const cy = centerScreenY ?? this.viewportH / 2;
    
    const before = this.screenToWorld(cx, cy);

    const newZoom = Math.max(this.minZoom, Math.min(this.maxZoom, this.zoom * factor));
    if (newZoom === this.zoom) return;
    this.zoom = newZoom;

    const after = this.screenToWorld(cx, cy);
    
    // 补偿位置，使缩放中心保持不动
    this.x += (before.x - after.x);
    this.y += (before.y - after.y);
  }

  /**
   * [Fix] 获取可视范围，并增加安全缓冲区
   * @param buffer 额外的缓冲区大小 (World Units)，用于预加载屏幕外的物体
   */
  getVisibleBounds(buffer: number = 0) {
    const tl = this.screenToWorld(0, 0);
    const br = this.screenToWorld(this.viewportW, this.viewportH);
    
    // 基础 padding：防止浮点数精度抖动导致的白边
    // 动态 padding：随缩放增加，zoom 越小(看得很远)，padding 越大
    const zoomPadding = 100 / this.zoom; 

    // 计算包含 Buffer 的最终边界
    return { 
      left: Math.min(tl.x, br.x) - zoomPadding - buffer, 
      top: Math.min(tl.y, br.y) - zoomPadding - buffer, 
      right: Math.max(tl.x, br.x) + zoomPadding + buffer, 
      bottom: Math.max(tl.y, br.y) + zoomPadding + buffer 
    };
  }
}