// src/engine/core/Engine.ts
import { World } from './World';
import { Camera } from './Camera';
import { Renderer } from '../systems/Renderer';
import { InputSystem } from '../systems/InputSystem';
import { AssetSystem } from '../systems/AssetSystem';
import { EventBus } from './EventBus';
import { IEngine, IPlugin, EngineConfig, EngineState, IRenderer } from '../types';

export class Engine implements IEngine {
  public canvas!: HTMLCanvasElement;
  public world: World;
  public camera: Camera;
  public events: EventBus;
  public input: InputSystem;
  public renderer: IRenderer;
  public assets: AssetSystem;
  public config: EngineConfig;
  public state: EngineState;

  private isRunning: boolean = true;
  private plugins: Map<string, IPlugin> = new Map();
  private _boundLoop: (time: number) => void;
  private resizeObserver: ResizeObserver;
  private lastTime: number = 0;
  private isDirty: boolean = true;

  constructor(config: EngineConfig) {
    this.config = config;
    this.state = this.createInitialState();
    this.setupDOM();

    this.events = new EventBus();
    this.world = new World(config.chunkSize || 128);
    this.camera = new Camera(); 
    this.assets = new AssetSystem(this.events);
    this.renderer = new Renderer(this.canvas, this.camera, this.world, this.assets);
    this.input = new InputSystem(this.canvas, this.camera, this.events);

    this.resizeObserver = new ResizeObserver(() => {
        this.resize();
        this.input.updateRectCache();
        this.requestRender();
    });
    this.resizeObserver.observe(config.container);

    this.setupBuiltinInteractions();
    this.setupRenderTriggers();

    this.resize();
    this._boundLoop = this.loop.bind(this);
    this.lastTime = performance.now();
    requestAnimationFrame(this._boundLoop);

    this.events.emit('engine:ready');
  }

  private setupRenderTriggers() {
    this.events.on('input:mousemove', () => this.requestRender());
    this.events.on('input:wheel', () => this.requestRender());
    this.events.on('state:change', () => this.requestRender());
    this.events.on('asset:loaded', () => this.requestRender());
    this.events.on('history:undo', () => this.requestRender());
    this.events.on('history:redo', () => this.requestRender());
    this.events.on('tool:set', () => this.requestRender());
  }

  public requestRender() {
      this.isDirty = true;
  }

  private createInitialState(): EngineState {
      return {
        currentTool: 'brush',
        fillMode: 'color',       
        activeColor: '#3b82f6',  
        activeImage: null,
        isContinuous: false,
        isReadOnly: this.config.readOnly || false,
        debugMode: false
    };
  }

  private setupDOM() {
    this.canvas = document.createElement('canvas');
    const { container } = this.config;
    container.style.position = 'relative';
    container.style.overflow = 'hidden';
    this.canvas.style.display = 'block';
    this.canvas.style.position = 'absolute';
    this.canvas.style.top = '0';
    this.canvas.style.left = '0';
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
    this.canvas.style.outline = 'none';
    this.canvas.style.touchAction = 'none';
    container.innerHTML = '';
    container.appendChild(this.canvas);
  }

  private setupBuiltinInteractions() {
    this.events.on('input:wheel', (e, screenPos) => {
       const zoomFactor = Math.exp(-e.deltaY * 0.001);
       this.camera.zoomBy(zoomFactor, screenPos.x, screenPos.y);
    });

    this.events.on('input:mousemove', (worldPos, e) => {
       const isHandMode = this.input.isSpacePressed || (this.state.isReadOnly && !this.input.isSpacePressed);
       if (this.input.isDragging && isHandMode) {
             this.camera.panBy(e.movementX, e.movementY);
             this.canvas.style.cursor = 'grabbing';
             this.requestRender();
       }
    });
    
    this.events.on('input:mouseup', () => {
        if (this.input.isSpacePressed || this.state.currentTool === 'hand') {
            this.canvas.style.cursor = 'grab';
        } else {
             this.canvas.style.cursor = 'default';
        }
        this.requestRender();
    });

    this.events.on('tool:set', (t) => { this.state.currentTool = t; });
    this.events.on('setting:continuous', (b) => { this.state.isContinuous = b; });
    
    this.events.on('style:set-color', (c) => { 
        this.state.fillMode = 'color';
        this.state.activeColor = c;
        this.events.emit('state:change', { fillMode: 'color', activeColor: c });
    });
    
    this.events.on('style:set-image', (imgObj) => { 
        this.state.fillMode = 'image';
        this.state.activeImage = imgObj;
        this.events.emit('state:change', { fillMode: 'image', activeImage: imgObj });
    });
  }

  public registerPlugin(plugin: IPlugin) {
    if (this.plugins.has(plugin.name)) return;
    plugin.onInit(this);
    this.plugins.set(plugin.name, plugin);
  }

  private loop(timestamp: number) {
    if (!this.isRunning) return;

    const dt = Math.min((timestamp - this.lastTime) / 1000, 0.1);
    this.lastTime = timestamp;

    // 1. 更新逻辑
    // [Fix] 使用公开方法判断相机状态
    const wasCameraMoving = this.camera.isMoving();
    this.camera.update(dt);
    const isCameraMoving = this.camera.isMoving();

    if (isCameraMoving || wasCameraMoving) {
        this.isDirty = true;
    }

    this.plugins.forEach(p => p.onUpdate && p.onUpdate(dt));

    // 2. 渲染逻辑
    if (this.isDirty) {
        this.renderer.clear();
        this.renderer.drawWorld();

        const ctx = (this.renderer as any).ctx;
        ctx.save();
        const dpr = window.devicePixelRatio || 1;
        ctx.translate(this.canvas.width / dpr / 2, this.canvas.height / dpr / 2);
        ctx.scale(this.camera.zoom, this.camera.zoom);
        ctx.translate(-this.camera.x, -this.camera.y);
        
        this.plugins.forEach(p => p.onRender && p.onRender(ctx));
        
        this.events.emit('render:after', ctx);
        ctx.restore();

        this.isDirty = false;
    }

    requestAnimationFrame(this._boundLoop);
  }

  public resize() {
    this.renderer.resize();
    this.requestRender();
  }

  public destroy() {
    this.isRunning = false;
    this.input.destroy();
    this.events.clear();
    this.assets.clear();
    this.resizeObserver.disconnect();
    this.plugins.forEach(p => p.onDestroy && p.onDestroy());
    this.canvas.remove();
  }
}