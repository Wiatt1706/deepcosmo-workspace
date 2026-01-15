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
    const parent = this.canvas.parentElement;
    if (!parent) return;

    // [FIXED] 使用 getBoundingClientRect 获取精确的 CSS 像素值
    // 这解决了浏览器缩放时可能产生的 1px 误差
    const rect = parent.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    const dpr = window.devicePixelRatio || 1;

    // 设置 Canvas 内部缓冲区大小 (物理像素)
    // 注意：我们不再设置 canvas.style.width/height，完全让 CSS (100%) 控制显示尺寸
    this.canvas.width = Math.round(width * dpr);
    this.canvas.height = Math.round(height * dpr);

    // 重置并应用缩放
    // 使用 resetTransform 确保不会在多次 resize 中累积变换
    this.ctx.resetTransform();
    this.ctx.scale(dpr, dpr);

    // 更新相机视口 (使用逻辑像素)
    this.camera.resize(width, height);
    
    // 立即重绘，防止缩放瞬间白屏或闪烁
    this.drawWorld();
  }

  clear() {
    const dpr = window.devicePixelRatio || 1;
    this.ctx.fillStyle = '#f5f6f8'; // Background Color
    // 使用逻辑尺寸清空屏幕
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
    const buffer = this.world.chunkSize; 
    const bounds = this.camera.getVisibleBounds(buffer);
    const blocks = this.world.queryBlocksInRect(bounds.left, bounds.top, bounds.right, bounds.bottom);

    // LOD 逻辑
    const zoom = this.camera.zoom;
    const isVeryFar = zoom < 0.2;
    const isCloseUp = zoom > 1.5;

    // 1. 绘制网格
    if (zoom > 0.4) {
        this.drawGrid(bounds, zoom);
    }

    // 2. 绘制方块
    for (const b of blocks) {
      if (isVeryFar && b.type === 'image') {
          this.ctx.fillStyle = '#374151'; 
          this.ctx.fillRect(b.x, b.y, b.w, b.h);
          continue; 
      }

      if (b.type === 'image' && b.imageUrl) {
        const img = this.textureManager.get(b.imageUrl); 
        if (img) {
          this.ctx.drawImage(img, b.x, b.y, b.w, b.h);
        } else {
          this.ctx.fillStyle = '#1f2937'; 
          this.ctx.fillRect(b.x, b.y, b.w, b.h);
          if (zoom > 1.0) {
              this.ctx.fillStyle = '#6b7280';
              this.ctx.font = '10px sans-serif';
              this.ctx.fillText("Loading...", b.x + 5, b.y + 20);
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
    
    // 3. 原点坐标轴
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