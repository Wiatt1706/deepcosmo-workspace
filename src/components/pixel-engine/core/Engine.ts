// src/engine/core/Engine.ts
import { World } from './World';
import { Camera } from './Camera';
import { Renderer } from '../systems/Renderer';
import { InputSystem } from '../systems/InputSystem';
import { AssetSystem } from '../systems/AssetSystem';
import { SelectionSystem } from '../systems/SelectionSystem';
import { HistorySystem } from '../systems/HistorySystem';
import { ProjectSystem } from '../systems/ProjectSystem'; // [New]
import { EventBus } from './EventBus';
import { 
    IEngine, 
    IPlugin, 
    EngineConfig, 
    EngineState, 
    IWorld,
    IRenderer,
    EngineSystems
} from '../types';
import { 
    BackgroundLayer, 
    BlockLayer, 
    GridLayer 
} from '../layers/StandardLayers';
import { SelectionLayer } from '../layers/SelectionLayer';

export class Engine implements IEngine {
    // --- 核心属性 ---
    public canvas!: HTMLCanvasElement;
    public world: IWorld;
    public camera: Camera;
    public events: EventBus;
    public input: InputSystem;
    public renderer: IRenderer;
    public assets: AssetSystem;
    
    // --- 子系统 ---
    public selection: SelectionSystem;
    public history: HistorySystem;
    public project: ProjectSystem; // [New]
    
    public config: EngineConfig;
    public state: EngineState;

    // --- 内部状态 ---
    private isRunning: boolean = true;
    private plugins: Map<string, IPlugin> = new Map();
    private resizeObserver: ResizeObserver;
    private isDirty: boolean = true;

    // --- 游戏循环 ---
    private _boundLoop: (time: number) => void;
    private lastTime: number = 0;
    private accumulator: number = 0;
    private readonly FIXED_TIME_STEP = 1 / 60;
    private readonly MAX_FRAME_TIME = 0.25;

    constructor(config: EngineConfig, systems: EngineSystems = {}) {
        this.config = config;
        this.state = this.createInitialState();
        this.setupDOM();

        // 1. 初始化事件总线
        this.events = new EventBus();

        // 2. 初始化核心系统 (优先使用注入的实例)
        this.world = systems.world || new World(config.chunkSize || 128);
        this.camera = systems.camera || new Camera();
        this.assets = systems.assets || new AssetSystem(this.events);
        
        // 3. 初始化业务子系统
        // Selection 依赖 EventBus 和 World
        this.selection = systems.selection || new SelectionSystem(this);
        
        // History 依赖 World (用于执行 Op)
        this.history = systems.history || new HistorySystem(this);
        
        // Project 依赖 World (用于序列化)
        this.project = systems.project || new ProjectSystem(this);

        // Renderer 和 Input 需要 Canvas
        this.renderer = systems.renderer || new Renderer(this.canvas, this.camera, this);
        this.input = systems.input || new InputSystem(this.canvas, this.camera, this.events);

        // 4. 组装默认渲染管线
        this.setupDefaultLayers();

        // 5. 设置监听器
        this.resizeObserver = new ResizeObserver(() => {
            this.resize();
            this.input.updateRectCache();
            this.requestRender();
        });
        this.resizeObserver.observe(config.container);

        this.setupBuiltinInteractions();
        this.setupRenderTriggers();

        // 6. 启动循环
        this.resize();
        this._boundLoop = this.loop.bind(this);
        this.lastTime = performance.now();
        requestAnimationFrame(this._boundLoop);

        this.events.emit('engine:ready');
    }

    private setupDefaultLayers() {
        this.renderer.layers.add(new BackgroundLayer(this));
        this.renderer.layers.add(new GridLayer(this));
        this.renderer.layers.add(new BlockLayer(this));
        this.renderer.layers.add(new SelectionLayer(this));
    }

    private setupRenderTriggers() {
        const render = () => this.requestRender();
        // 基础交互触发重绘
        this.events.on('input:mousemove', render);
        this.events.on('input:wheel', render);
        this.events.on('state:change', render);
        this.events.on('asset:loaded', render);
        this.events.on('tool:set', render);
        this.events.on('selection:change', render);
        
        // 历史记录触发
        // 注意：InputSystem 可能会发出 history:undo 事件（如果快捷键被触发）
        // 我们在这里监听并执行实际逻辑
        this.events.on('history:undo', () => this.history.undo());
        this.events.on('history:redo', () => this.history.redo());
        this.events.on('history:state-change', render);
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
        // Zoom
        this.events.on('input:wheel', (e, screenPos) => {
            const zoomFactor = Math.exp(-e.deltaY * 0.001);
            this.camera.zoomBy(zoomFactor, screenPos.x, screenPos.y);
        });

        // State Sync
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

    public requestRender() {
        this.isDirty = true;
    }

    private loop(timestamp: number) {
        if (!this.isRunning) return;

        let frameTime = (timestamp - this.lastTime) / 1000;
        this.lastTime = timestamp;

        if (frameTime > this.MAX_FRAME_TIME) {
            frameTime = this.MAX_FRAME_TIME;
        }

        this.accumulator += frameTime;

        // Loop Protection (防止死亡螺旋)
        let updates = 0;
        const MAX_UPDATES = 5;

        while (this.accumulator >= this.FIXED_TIME_STEP && updates < MAX_UPDATES) {
            this.fixedUpdate(this.FIXED_TIME_STEP);
            this.accumulator -= this.FIXED_TIME_STEP;
            updates++;
        }
        
        if (updates === MAX_UPDATES) {
            this.accumulator = 0;
        }

        this.render();
        requestAnimationFrame(this._boundLoop);
    }

    private fixedUpdate(dt: number) {
        const wasCameraMoving = this.camera.isMoving();
        this.camera.update(dt);
        const isCameraMoving = this.camera.isMoving();

        if (isCameraMoving || wasCameraMoving) {
            this.isDirty = true;
        }

        this.plugins.forEach(p => p.onUpdate && p.onUpdate(dt));
    }

    private render() {
        if (this.isDirty) {
            this.renderer.draw(); 
            
            // Post-process / UI Layer Hook
            const ctx = this.renderer.ctx;
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
        this.renderer.layers.clear();
        this.selection.clear();
        this.history.clear(); // Clear history
        this.resizeObserver.disconnect();
        this.plugins.forEach(p => p.onDestroy && p.onDestroy());
        this.canvas.remove();
    }
}