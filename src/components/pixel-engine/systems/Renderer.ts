// src/engine/systems/Renderer.ts
import { Camera } from '../core/Camera';
import { World } from '../core/World';
import { AssetSystem } from './AssetSystem'; // [New]
import { IRenderer } from '../types';

export class Renderer implements IRenderer {
  public ctx: CanvasRenderingContext2D;

  constructor(
    private canvas: HTMLCanvasElement,
    private camera: Camera,
    private world: World,
    private assets: AssetSystem // [New] 注入 AssetSystem
  ) {
    this.ctx = this.canvas.getContext('2d', { alpha: false })!;
  }

  resize() {
    const parent = this.canvas.parentElement;
    if (!parent) return;

    const rect = parent.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const dpr = window.devicePixelRatio || 1;

    this.canvas.width = Math.round(width * dpr);
    this.canvas.height = Math.round(height * dpr);

    this.ctx.resetTransform();
    this.ctx.scale(dpr, dpr);

    this.camera.resize(width, height);
    this.drawWorld();
  }

  clear() {
    const dpr = window.devicePixelRatio || 1;
    this.ctx.fillStyle = '#f5f6f8'; // Background Color
    this.ctx.fillRect(0, 0, this.canvas.width / dpr, this.canvas.height / dpr);
  }

  drawWorld() {
    this.ctx.save();
    const dpr = window.devicePixelRatio || 1;
    
    this.ctx.translate(this.canvas.width / dpr / 2, this.canvas.height / dpr / 2);
    this.ctx.scale(this.camera.zoom, this.camera.zoom);
    this.ctx.translate(-this.camera.x, -this.camera.y);

    const buffer = this.world.chunkSize; 
    const bounds = this.camera.getVisibleBounds(buffer);
    const blocks = this.world.queryBlocksInRect(bounds.left, bounds.top, bounds.right, bounds.bottom);

    const zoom = this.camera.zoom;
    const isVeryFar = zoom < 0.2;
    const isCloseUp = zoom > 1.5;

    // 1. Grid
    if (zoom > 0.4) {
        this.drawGrid(bounds, zoom);
    }

    // 2. Blocks
    for (const b of blocks) {
      if (isVeryFar && b.type === 'image') {
          this.ctx.fillStyle = '#374151'; 
          this.ctx.fillRect(b.x, b.y, b.w, b.h);
          continue; 
      }

      if (b.type === 'image' && b.imageUrl) {
        // [Change] 使用 AssetSystem 获取纹理
        const img = this.assets.getTexture(b.imageUrl);
        
        if (img) {
          this.ctx.drawImage(img, b.x, b.y, b.w, b.h);
        } else {
          // Loading Placeholder
          this.ctx.fillStyle = '#1f2937'; 
          this.ctx.fillRect(b.x, b.y, b.w, b.h);
          
          if (zoom > 1.0) {
              this.ctx.fillStyle = '#6b7280';
              this.ctx.font = `${10/zoom}px sans-serif`;
              this.ctx.fillText("...", b.x + b.w/2 - 5/zoom, b.y + b.h/2);
          }
        }
      } else {
        this.ctx.fillStyle = b.color;
        this.ctx.fillRect(b.x, b.y, b.w, b.h);
      }

      if (isCloseUp) {
          this.ctx.strokeStyle = 'rgba(255,255,255,0.15)';
          this.ctx.lineWidth = 1 / zoom; 
          this.ctx.strokeRect(b.x, b.y, b.w, b.h);

          if (b.type === 'nested') {
              this.ctx.strokeStyle = '#a855f7';
              this.ctx.lineWidth = 2 / zoom;
              this.ctx.strokeRect(b.x, b.y, b.w, b.h);
          }
      }
    }
    
    // 3. Axis
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
    this.ctx.strokeStyle = 'rgba(55,55,55,0.15)';
    this.ctx.lineWidth = Math.max(0.5 / zoom, 0.5); 
    this.ctx.beginPath();
    
    // Align grid to gridSize to avoid jitter
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