// src/engine/systems/Renderer.ts
import { Camera } from '../core/Camera';
import { World } from '../core/World';
import { TextureManager } from './TextureManager';

export class Renderer {
  public ctx: CanvasRenderingContext2D;
  private textureManager: TextureManager;

  constructor(
    private canvas: HTMLCanvasElement,
    private camera: Camera,
    private world: World
  ) {
    this.ctx = this.canvas.getContext('2d', { alpha: false })!;
    this.textureManager = new TextureManager();
  }

  resize() {
    if (!this.canvas.parentElement) return;
    const { clientWidth, clientHeight } = this.canvas.parentElement;
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = clientWidth * dpr;
    this.canvas.height = clientHeight * dpr;
    this.canvas.style.width = `${clientWidth}px`;
    this.canvas.style.height = `${clientHeight}px`;
    this.ctx.scale(dpr, dpr);
    this.camera.resize(clientWidth, clientHeight);
  }

  clear() {
    const dpr = window.devicePixelRatio || 1;
    this.ctx.fillStyle = '#111827'; // Gray-900 Background
    this.ctx.fillRect(0, 0, this.canvas.width / dpr, this.canvas.height / dpr);
  }

  drawWorld() {
    this.ctx.save();
    const dpr = window.devicePixelRatio || 1;
    
    // 应用摄像机变换
    this.ctx.translate(this.canvas.width / dpr / 2, this.canvas.height / dpr / 2);
    this.ctx.scale(this.camera.zoom, this.camera.zoom);
    this.ctx.translate(-this.camera.x, -this.camera.y);

    // 可视剔除
    const buffer = this.world.chunkSize; // 稍微多加载一点，防止快速拖动白边
    const bounds = this.camera.getVisibleBounds(buffer);
    const blocks = this.world.queryBlocksInRect(bounds.left, bounds.top, bounds.right, bounds.bottom);

    // [New] LOD 逻辑：根据 Zoom 级别决定绘制细节
    const zoom = this.camera.zoom;
    const isVeryFar = zoom < 0.2;
    const isCloseUp = zoom > 1.5;

    // 1. 绘制网格 (仅在一定缩放比例下显示)
    if (zoom > 0.4) {
        this.drawGrid(bounds, zoom);
    }

    // 2. 绘制方块
    for (const b of blocks) {
      // 优化：太远时不渲染图片，只渲染颜色占位符 (大幅提升性能)
      if (isVeryFar && b.type === 'image') {
          this.ctx.fillStyle = '#374151'; // 灰色占位
          this.ctx.fillRect(b.x, b.y, b.w, b.h);
          continue; 
      }

      // 正常绘制
      if (b.type === 'image' && b.imageUrl) {
        const img = this.textureManager.get(b.imageUrl); 
        if (img) {
          this.ctx.drawImage(img, b.x, b.y, b.w, b.h);
        } else {
          // Loading 或 失败 状态
          this.ctx.fillStyle = '#1f2937'; 
          this.ctx.fillRect(b.x, b.y, b.w, b.h);
          if (zoom > 1.0) {
              this.ctx.fillStyle = '#6b7280';
              this.ctx.font = '10px sans-serif';
              this.ctx.fillText("Loading...", b.x + 5, b.y + 20);
          }
        }
      } else {
        // 基础方块
        this.ctx.fillStyle = b.color;
        this.ctx.fillRect(b.x, b.y, b.w, b.h);
      }

      // [New] 矢量增强：当拉得很近时，绘制矢量边框和文字，保持清晰度
      if (isCloseUp) {
          // 细边框
          this.ctx.strokeStyle = 'rgba(255,255,255,0.15)';
          this.ctx.lineWidth = 1 / zoom; // 始终保持 1px 屏幕像素宽度
          this.ctx.strokeRect(b.x, b.y, b.w, b.h);

          // 如果有 Nested World，绘制特殊标识
          if (b.type === 'nested') {
              this.ctx.strokeStyle = '#a855f7';
              this.ctx.lineWidth = 2 / zoom;
              this.ctx.strokeRect(b.x, b.y, b.w, b.h);
          }
      }
    }
    
    // 3. 原点坐标轴 (调试用)
    this.ctx.strokeStyle = '#4b5563';
    this.ctx.lineWidth = 2 / zoom;
    this.ctx.beginPath();
    this.ctx.moveTo(-50, 0); this.ctx.lineTo(50, 0);
    this.ctx.moveTo(0, -50); this.ctx.lineTo(0, 50);
    this.ctx.stroke();

    this.ctx.restore();
  }

  private drawGrid(bounds: any, zoom: number) {
    const gridSize = 20;
    this.ctx.strokeStyle = '#1f2937';
    // 线条宽度随缩放变细，看起来更精致
    this.ctx.lineWidth = Math.max(0.5 / zoom, 0.5); 
    this.ctx.beginPath();
    
    // 优化：只画视口内的线
    const startX = Math.floor(bounds.left / gridSize) * gridSize;
    const startY = Math.floor(bounds.top / gridSize) * gridSize;
    
    for (let x = startX; x < bounds.right; x += gridSize) {
        this.ctx.moveTo(x, bounds.top); this.ctx.lineTo(x, bounds.bottom);
    }
    for (let y = startY; y < bounds.bottom; y += gridSize) {
        this.ctx.moveTo(bounds.left, y); this.ctx.lineTo(bounds.right, y);
    }
    this.ctx.stroke();
  }
}