// src/engine/core/Engine.ts
import { World } from './World';
import { Camera } from './Camera';
import { Renderer } from '../systems/Renderer';
import { InputSystem } from '../systems/InputSystem';
import { AssetSystem } from '../systems/AssetSystem';
import { SelectionSystem } from '../systems/SelectionSystem'; // [New]
import { EventBus } from './EventBus';
import { 
    IEngine, 
    IPlugin, 
    EngineConfig, 
    EngineState, 
    IWorld,
    IRenderer
} from '../types';
import { 
    BackgroundLayer, 
    BlockLayer, 
    GridLayer 
} from '../layers/StandardLayers';
import { SelectionLayer } from '../layers/SelectionLayer'; // [New]

// [DI] 定义依赖注入的系统结构
export interface EngineSystems {
    world?: IWorld;
    renderer?: IRenderer;
    input?: InputSystem;
    assets?: AssetSystem;
    camera?: Camera;
    selection?: SelectionSystem; // [New] 支持注入选区系统
}

export class Engine implements IEngine {
    // --- 核心属性 ---
    public canvas!: HTMLCanvasElement;
    public world: IWorld;
    public camera: Camera;
    public events: EventBus;
    public input: InputSystem;
    public renderer: IRenderer;
    public assets: AssetSystem;
    public selection: SelectionSystem; // [New] 选区系统属性
    
    public config: EngineConfig;
    public state: EngineState;

    // --- 内部状态 ---
    private isRunning: boolean = true;
    private plugins: Map<string, IPlugin> = new Map();
    private resizeObserver: ResizeObserver;
    private isDirty: boolean = true;

    // --- 游戏循环 (Game Loop) 变量 ---
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
        
        // [New] 初始化选区系统
        // 注意：SelectionSystem 依赖 EventBus，必须在 events 之后
        // 且必须在 setupDefaultLayers 之前，因为 SelectionLayer 可能会用到它
        this.selection = systems.selection || new SelectionSystem(this);

        // Renderer 和 Input 需要 Canvas
        this.renderer = systems.renderer || new Renderer(this.canvas, this.camera, this);
        this.input = systems.input || new InputSystem(this.canvas, this.camera, this.events);

        // 3. [Pipeline] 组装默认渲染管线
        this.setupDefaultLayers();

        // 4. 设置监听器
        this.resizeObserver = new ResizeObserver(() => {
            this.resize();
            this.input.updateRectCache();
            this.requestRender();
        });
        this.resizeObserver.observe(config.container);

        this.setupBuiltinInteractions();
        this.setupRenderTriggers();

        // 5. 启动循环
        this.resize();
        this._boundLoop = this.loop.bind(this);
        this.lastTime = performance.now();
        requestAnimationFrame(this._boundLoop);

        this.events.emit('engine:ready');
    }

    /**
     * [Pipeline] 初始化默认图层
     * 绘制顺序：背景 -> 网格 -> 方块 -> 选区 -> 工具预览
     */
    private setupDefaultLayers() {
        this.renderer.layers.add(new BackgroundLayer(this));
        this.renderer.layers.add(new GridLayer(this));
        this.renderer.layers.add(new BlockLayer(this));
        
        // [New] 添加选区图层 (Ants Line)
        this.renderer.layers.add(new SelectionLayer(this));
    }

    private setupRenderTriggers() {
        const render = () => this.requestRender();
        this.events.on('input:mousemove', render);
        this.events.on('input:wheel', render);
        this.events.on('state:change', render);
        this.events.on('asset:loaded', render);
        this.events.on('history:undo', render);
        this.events.on('history:redo', render);
        this.events.on('tool:set', render);
        
        // [New] 选区变化也触发重绘
        this.events.on('selection:change', render);
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

        let frameTime = (timestamp - this.lastTime) / 1000;
        this.lastTime = timestamp;

        if (frameTime > this.MAX_FRAME_TIME) {
            frameTime = this.MAX_FRAME_TIME;
        }

        this.accumulator += frameTime;

        while (this.accumulator >= this.FIXED_TIME_STEP) {
            this.fixedUpdate(this.FIXED_TIME_STEP);
            this.accumulator -= this.FIXED_TIME_STEP;
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
            
            // Post-Processing Hook
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
        // 清理选区
        this.selection.clear();
        this.resizeObserver.disconnect();
        this.plugins.forEach(p => p.onDestroy && p.onDestroy());
        this.canvas.remove();
    }
}