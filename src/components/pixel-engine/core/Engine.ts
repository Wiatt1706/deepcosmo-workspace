// src/engine/core/Engine.ts
import { World } from './World';
import { Camera } from './Camera';
import { Renderer } from '../systems/Renderer';
import { InputSystem } from '../systems/InputSystem';
import { EventBus } from './EventBus';
import { IEngine, IPlugin, EngineConfig } from '../types';

// 实现 IEngine 接口
export class Engine implements IEngine {
  public canvas: HTMLCanvasElement;
  public world: World;
  public camera: Camera;
  public events: EventBus;
  public input: InputSystem;
  public renderer: Renderer;

  private isRunning: boolean = true;
  private plugins: Map<string, IPlugin> = new Map();
  private _boundLoop: () => void;
  private resizeObserver: ResizeObserver;

  constructor(config: EngineConfig) {
    // 1. DOM Setup
    this.canvas = document.createElement('canvas');
    config.container.innerHTML = '';
    config.container.appendChild(this.canvas);

    // 2. Systems Setup
    this.events = new EventBus();
    this.world = new World();
    this.camera = new Camera();
    this.renderer = new Renderer(this.canvas, this.camera, this.world);
    this.input = new InputSystem(this.canvas, this.camera, this.events);

    // 3. Auto Resize
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(config.container);

    // 4. Built-in behaviors (Camera Control)
    this.setupBuiltinInteractions();

    // 5. Start Loop
    this.resize();
    this._boundLoop = this.loop.bind(this);
    requestAnimationFrame(this._boundLoop);

    this.events.emit('engine:ready');
  }

  private setupBuiltinInteractions() {
    this.events.on('input:wheel', (e, screenPos) => {
       const zoomFactor = Math.exp(-e.deltaY * 0.001);
       this.camera.zoomBy(zoomFactor, screenPos.x, screenPos.y);
    });
  }

  public registerPlugin(plugin: IPlugin) {
    if (this.plugins.has(plugin.name)) return;
    // 注入 this (Engine 实例)
    plugin.onInit(this);
    this.plugins.set(plugin.name, plugin);
  }

  private loop() {
    if (!this.isRunning) return;

    // Update
    const dt = 16; 
    this.plugins.forEach(p => p.onUpdate && p.onUpdate(dt));

    // Render
    this.renderer.clear();
    this.renderer.drawWorld();

    // Plugin Render Overlay (UI, Ghosts, Selection)
    this.renderer.ctx.save();
    const dpr = window.devicePixelRatio || 1;
    this.renderer.ctx.translate(this.canvas.width / dpr / 2, this.canvas.height / dpr / 2);
    this.renderer.ctx.scale(this.camera.zoom, this.camera.zoom);
    this.renderer.ctx.translate(-this.camera.x, -this.camera.y);
    
    // 让插件在场景之上绘制
    this.plugins.forEach(p => p.onRender && p.onRender(this.renderer.ctx));
    // 触发渲染后事件
    this.events.emit('render:after', this.renderer.ctx);
    
    this.renderer.ctx.restore();

    requestAnimationFrame(this._boundLoop);
  }

  public resize() {
    this.renderer.resize();
  }

  public destroy() {
    this.isRunning = false;
    this.input.destroy();
    this.events.clear();
    this.resizeObserver.disconnect();
    this.plugins.forEach(p => p.onDestroy && p.onDestroy());
    this.canvas.remove();
  }
}