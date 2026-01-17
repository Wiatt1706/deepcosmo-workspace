// src/engine/systems/InputSystem.ts
import { Camera } from '../core/Camera';
import { IEventBus, Vec2 } from '../types';

export class InputSystem {
  public mouseScreen: Vec2 = { x: 0, y: 0 };
  public mouseWorld: Vec2 = { x: 0, y: 0 };
  public isDragging: boolean = false;
  public isSpacePressed: boolean = false;

  // [Optimization] 缓存 DOMRect，避免在 mousemove 中导致 Layout Thrashing
  private rectCache: DOMRect | null = null;
  private _handlers: { [key: string]: (e: any) => void } = {};

  constructor(
    private canvas: HTMLCanvasElement,
    private camera: Camera,
    private events: IEventBus
  ) {
    // 初始化时获取一次
    this.updateRectCache();
    this.bindEvents();
  }

  /**
   * [Core] 更新 DOM 位置缓存
   * 必须在 Resize 或 Scroll 时调用
   */
  public updateRectCache() {
      this.rectCache = this.canvas.getBoundingClientRect();
  }

  private updatePos(clientX: number, clientY: number) {
    // 惰性兜底：如果缓存丢失，重新获取
    if (!this.rectCache) {
        this.updateRectCache();
    }
    
    // [Optimization] 使用缓存计算，极快
    if (this.rectCache) {
        this.mouseScreen = { 
            x: clientX - this.rectCache.left, 
            y: clientY - this.rectCache.top 
        };
        this.mouseWorld = this.camera.screenToWorld(this.mouseScreen.x, this.mouseScreen.y);
    }
  }

  private bindEvents() {
    this._handlers.keydown = (e: KeyboardEvent) => {
      if (e.code === 'Space') this.isSpacePressed = true;
      this.events.emit('input:keydown', e);
    };
    this._handlers.keyup = (e: KeyboardEvent) => {
      if (e.code === 'Space') this.isSpacePressed = false;
      this.events.emit('input:keyup', e);
    };
    this._handlers.mousemove = (e: MouseEvent) => {
      this.updatePos(e.clientX, e.clientY);
      this.events.emit('input:mousemove', this.mouseWorld, e);
    };
    this._handlers.mouseup = (e: MouseEvent) => {
      this.isDragging = false;
      this.events.emit('input:mouseup', this.mouseWorld, e);
    };
    this._handlers.mousedown = (e: MouseEvent) => {
      this.updatePos(e.clientX, e.clientY);
      this.isDragging = true;
      this.events.emit('input:mousedown', this.mouseWorld, e);
    };
    this._handlers.dblclick = (e: MouseEvent) => {
      this.updatePos(e.clientX, e.clientY);
      this.events.emit('input:dblclick', this.mouseWorld, e);
    };
    this._handlers.wheel = (e: WheelEvent) => {
      e.preventDefault();
      this.events.emit('input:wheel', e, this.mouseScreen);
    };

    window.addEventListener('keydown', this._handlers.keydown);
    window.addEventListener('keyup', this._handlers.keyup);
    window.addEventListener('mousemove', this._handlers.mousemove);
    window.addEventListener('mouseup', this._handlers.mouseup);
    
    this.canvas.addEventListener('mousedown', this._handlers.mousedown);
    this.canvas.addEventListener('dblclick', this._handlers.dblclick);
    this.canvas.addEventListener('wheel', this._handlers.wheel as any, { passive: false });
  }

  public destroy() {
    window.removeEventListener('keydown', this._handlers.keydown);
    window.removeEventListener('keyup', this._handlers.keyup);
    window.removeEventListener('mousemove', this._handlers.mousemove);
    window.removeEventListener('mouseup', this._handlers.mouseup);
    
    this.canvas.removeEventListener('mousedown', this._handlers.mousedown);
    this.canvas.removeEventListener('dblclick', this._handlers.dblclick);
    this.canvas.removeEventListener('wheel', this._handlers.wheel as any);
  }
}