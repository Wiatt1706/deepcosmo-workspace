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
    this.ctx.fillStyle = '#111827';
    this.ctx.fillRect(0, 0, this.canvas.width / dpr, this.canvas.height / dpr);
  }

  drawWorld() {
    this.ctx.save();
    const dpr = window.devicePixelRatio || 1;
    this.ctx.translate(this.canvas.width / dpr / 2, this.canvas.height / dpr / 2);
    this.ctx.scale(this.camera.zoom, this.camera.zoom);
    this.ctx.translate(-this.camera.x, -this.camera.y);

    // [Change] 移除巨大的 buffer。
    // 由于 World 的查询现在是精确的，我们不需要预加载很远的内容。
    // 这里的 0 或者一个小值 (如 this.world.chunkSize / 2) 仅用于平滑滚动体验。
    // 严谨模式下，0 也是可以的，但为了体验顺滑，保留一个小 buffer。
    const smallPadding = this.world.chunkSize / 2; 
    const bounds = this.camera.getVisibleBounds(smallPadding);

    // 1. Grid
    if (this.camera.zoom > 0.4) {
        this.drawGrid(bounds);
    }

    // 2. Blocks (World 现在会返回精确的结果，并已去重)
    const blocks = this.world.queryBlocksInRect(bounds.left, bounds.top, bounds.right, bounds.bottom);
    
    for (const b of blocks) {
      if (b.type === 'image' && b.imageUrl) {
        const img = this.textureManager.get(b.imageUrl); 
        if (img) {
          this.ctx.drawImage(img, b.x, b.y, b.w, b.h);
        } else {
          this.ctx.fillStyle = '#374151'; 
          this.ctx.fillRect(b.x, b.y, b.w, b.h);
        }
      } else {
        this.ctx.fillStyle = b.color;
        this.ctx.fillRect(b.x, b.y, b.w, b.h);
      }
    }
    
    // 3. Origin Axis
    this.ctx.strokeStyle = '#4b5563';
    this.ctx.lineWidth = 2 / this.camera.zoom;
    this.ctx.beginPath();
    this.ctx.moveTo(-50, 0); this.ctx.lineTo(50, 0);
    this.ctx.moveTo(0, -50); this.ctx.lineTo(0, 50);
    this.ctx.stroke();

    this.ctx.restore();
  }

  private drawGrid(bounds: any) {
    const gridSize = 20;
    this.ctx.strokeStyle = '#1f2937';
    this.ctx.lineWidth = 1 / this.camera.zoom;
    this.ctx.beginPath();
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