// src/engine/systems/InputSystem.ts
import { Camera } from '../core/Camera';
import { IEventBus, Vec2 } from '../types';

export class InputSystem {
  public mouseScreen: Vec2 = { x: 0, y: 0 };
  public mouseWorld: Vec2 = { x: 0, y: 0 };
  public isDragging: boolean = false;
  public isSpacePressed: boolean = false;

  private _handlers: { [key: string]: (e: any) => void } = {};

  constructor(
    private canvas: HTMLCanvasElement,
    private camera: Camera,
    private events: IEventBus
  ) {
    this.bindEvents();
  }

  private updatePos(clientX: number, clientY: number) {
    const rect = this.canvas.getBoundingClientRect();
    this.mouseScreen = { x: clientX - rect.left, y: clientY - rect.top };
    this.mouseWorld = this.camera.screenToWorld(this.mouseScreen.x, this.mouseScreen.y);
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
    // [New] 双击事件
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
    this.canvas.addEventListener('dblclick', this._handlers.dblclick); // [New]
    this.canvas.addEventListener('wheel', this._handlers.wheel as any, { passive: false });
  }

  public destroy() {
    window.removeEventListener('keydown', this._handlers.keydown);
    window.removeEventListener('keyup', this._handlers.keyup);
    window.removeEventListener('mousemove', this._handlers.mousemove);
    window.removeEventListener('mouseup', this._handlers.mouseup);
    
    this.canvas.removeEventListener('mousedown', this._handlers.mousedown);
    this.canvas.removeEventListener('dblclick', this._handlers.dblclick); // [New]
    this.canvas.removeEventListener('wheel', this._handlers.wheel as any);
  }
}