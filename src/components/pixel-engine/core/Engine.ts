import { World } from './World';
import { Camera } from './Camera';
import { Renderer } from '../systems/Renderer';
import { InputSystem } from '../systems/InputSystem';
import { EventBus } from './EventBus';
import { IEngine, IPlugin, EngineConfig, EngineState } from '../types';

export class Engine implements IEngine {
  public canvas: HTMLCanvasElement;
  public world: World;
  public camera: Camera;
  public events: EventBus;
  public input: InputSystem;
  public renderer: Renderer;
  public config: EngineConfig;

  public state: EngineState;

  private isRunning: boolean = true;
  private plugins: Map<string, IPlugin> = new Map();
  private _boundLoop: (time: number) => void;
  private resizeObserver: ResizeObserver;
  private lastTime: number = 0;

  constructor(config: EngineConfig) {
    this.config = config;

    // 1. 初始化状态
    this.state = {
        currentTool: 'brush',
        fillMode: 'color',       
        activeColor: '#3b82f6',  
        activeImage: null,
        isContinuous: false,
        isReadOnly: config.readOnly || false,
        debugMode: false
    };

    // 2. DOM Setup [FIXED]
    // 使用 "Absolute + Overflow Hidden" 策略防止出现滚动条
    this.canvas = document.createElement('canvas');
    
    // 强制父容器建立定位上下文，并裁剪溢出
    config.container.style.position = 'relative';
    config.container.style.overflow = 'hidden';
    
    // Canvas 脱离文档流，填满容器
    this.canvas.style.display = 'block';
    this.canvas.style.position = 'absolute';
    this.canvas.style.top = '0';
    this.canvas.style.left = '0';
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
    this.canvas.style.outline = 'none';
    this.canvas.style.touchAction = 'none';

    config.container.innerHTML = '';
    config.container.appendChild(this.canvas);

    // 3. Systems Setup
    this.events = new EventBus();
    this.world = new World(config.chunkSize || 128);
    this.camera = new Camera(); 
    this.renderer = new Renderer(this.canvas, this.camera, this.world);
    this.input = new InputSystem(this.canvas, this.camera, this.events);

    // 4. Auto Resize
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(config.container);

    // 5. Interactions
    this.setupBuiltinInteractions();

    // 6. Loop
    this.resize();
    this._boundLoop = this.loop.bind(this);
    this.lastTime = performance.now();
    requestAnimationFrame(this._boundLoop);

    this.events.emit('engine:ready');
  }

  private setupBuiltinInteractions() {
    // Zoom
    this.events.on('input:wheel', (e, screenPos) => {
       const zoomFactor = Math.exp(-e.deltaY * 0.001);
       this.camera.zoomBy(zoomFactor, screenPos.x, screenPos.y);
    });

    // Pan (Space)
    this.events.on('input:mousemove', (worldPos, e) => {
       const isHandMode = this.input.isSpacePressed || (this.state.isReadOnly && !this.input.isSpacePressed);
       if (this.input.isDragging && isHandMode) {
             this.camera.panBy(e.movementX, e.movementY);
             this.canvas.style.cursor = 'grabbing';
       }
    });
    
    this.events.on('input:mouseup', () => {
        if (this.input.isSpacePressed || this.state.currentTool === 'hand') {
            this.canvas.style.cursor = 'grab';
        } else {
             this.canvas.style.cursor = 'default';
        }
    });

    // State Sync
    this.events.on('tool:set', (t) => { this.state.currentTool = t; });
    this.events.on('setting:continuous', (b) => { this.state.isContinuous = b; });
    
    this.events.on('style:set-color', (c) => { 
        this.state.fillMode = 'color';
        this.state.activeColor = c;
        this.events.emit('state:change', { fillMode: 'color', activeColor: c });
    });
    
    this.events.on('style:set-image', (img) => { 
        this.state.fillMode = 'image';
        this.state.activeImage = img;
        this.events.emit('state:change', { fillMode: 'image', activeImage: img });
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

    this.camera.update(dt);
    this.plugins.forEach(p => p.onUpdate && p.onUpdate(dt));

    this.renderer.clear();
    this.renderer.drawWorld();

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