// src/engine/core/Engine.ts
import { World } from './World';
import { Camera } from './Camera';
import { Renderer } from '../systems/Renderer';
import { InputSystem } from '../systems/InputSystem';
import { EventBus } from './EventBus';
import { IEngine, IPlugin, EngineConfig } from '../types';

export class Engine implements IEngine {
  public canvas: HTMLCanvasElement;
  public world: World;
  public camera: Camera;
  public events: EventBus;
  public input: InputSystem;
  public renderer: Renderer;
  public config: EngineConfig; // Public Config

  private isRunning: boolean = true;
  private plugins: Map<string, IPlugin> = new Map();
  private _boundLoop: () => void;
  private resizeObserver: ResizeObserver;

  constructor(config: EngineConfig) {
    this.config = config; // Save config

    // 1. DOM Setup
    this.canvas = document.createElement('canvas');
    this.canvas.style.display = 'block'; // 防止内联元素空隙
    this.canvas.style.outline = 'none';
    config.container.innerHTML = '';
    config.container.appendChild(this.canvas);

    // 2. Systems Setup
    this.events = new EventBus();
    this.world = new World(config.chunkSize || 128);
    this.camera = new Camera();
    this.renderer = new Renderer(this.canvas, this.camera, this.world);
    this.input = new InputSystem(this.canvas, this.camera, this.events);

    // 3. Auto Resize
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(config.container);

    // 4. Built-in interactions (Camera Control)
    this.setupBuiltinInteractions();

    // 5. Start Loop
    this.resize();
    this._boundLoop = this.loop.bind(this);
    requestAnimationFrame(this._boundLoop);

    this.events.emit('engine:ready');
  }

  private setupBuiltinInteractions() {
    // 滚轮缩放
    this.events.on('input:wheel', (e, screenPos) => {
       const zoomFactor = Math.exp(-e.deltaY * 0.001);
       this.camera.zoomBy(zoomFactor, screenPos.x, screenPos.y);
    });

    // 鼠标拖拽 (如果不处于特定工具模式)
    // 注意：具体工具(如笔刷)可能会拦截或阻止此行为，这里作为基础底座
    this.events.on('input:mousemove', (worldPos, e) => {
        // 如果按住了空格 或者是 展示模式(readOnly)，则允许拖拽平移
        const isHandMode = this.input.isSpacePressed || (this.config.readOnly && !this.input.isSpacePressed); // 简化逻辑：readOnly 默认就是漫游
        
        if (this.input.isDragging && isHandMode) {
             // 只有当没有被其他逻辑(如Selection)阻止时
             this.camera.panBy(e.movementX, e.movementY);
             this.canvas.style.cursor = 'grabbing';
        }
    });
    
    this.events.on('input:mouseup', () => {
        this.canvas.style.cursor = 'default';
    });
  }

  public registerPlugin(plugin: IPlugin) {
    if (this.plugins.has(plugin.name)) return;
    plugin.onInit(this);
    this.plugins.set(plugin.name, plugin);
  }

  private loop() {
    if (!this.isRunning) return;

    const dt = 16; 

    // 1. Update Physics (Camera) [New]
    this.camera.update();

    // 2. Update Plugins
    this.plugins.forEach(p => p.onUpdate && p.onUpdate(dt));

    // 3. Render World
    this.renderer.clear();
    this.renderer.drawWorld();

    // 4. Render Plugins Overlay
    this.renderer.ctx.save();
    const dpr = window.devicePixelRatio || 1;
    this.renderer.ctx.translate(this.canvas.width / dpr / 2, this.canvas.height / dpr / 2);
    this.renderer.ctx.scale(this.camera.zoom, this.camera.zoom);
    this.renderer.ctx.translate(-this.camera.x, -this.camera.y);
    
    this.plugins.forEach(p => p.onRender && p.onRender(this.renderer.ctx));
    
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