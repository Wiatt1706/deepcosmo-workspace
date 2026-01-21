// src/engine/core/Engine.ts
import { World } from './World';
import { Camera } from './Camera';
import { Renderer } from '../systems/Renderer';
import { InputSystem } from '../systems/InputSystem';
import { AssetSystem } from '../systems/AssetSystem';
import { EventBus } from './EventBus';
import { 
    IEngine, 
    IPlugin, 
    EngineConfig, 
    EngineState, 
    IWorld,
    IRenderer
} from '../types';
import { BackgroundLayer, BlockLayer, GridLayer } from '../layers/StandardLayers';

// [DI] 定义依赖注入的系统结构
// 允许外部传入自定义的 World 实现（如 QuadTreeWorld）或其他系统的 Mock 版本
export interface EngineSystems {
    world?: IWorld;
    renderer?: IRenderer; // 这里可以使用接口，但在构造默认值时我们需要具体的类
    input?: InputSystem;
    assets?: AssetSystem;
    camera?: Camera;
}

export class Engine implements IEngine {
    // --- 核心属性 ---
    public canvas!: HTMLCanvasElement;
    public world: IWorld;      // [Change] 使用接口类型，支持多态
    public camera: Camera;
    public events: EventBus;
    public input: InputSystem;
    public renderer: IRenderer;
    public assets: AssetSystem;
    
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
    private readonly FIXED_TIME_STEP = 1 / 60; // 逻辑更新固定为 60 FPS (约 16.67ms)
    private readonly MAX_FRAME_TIME = 0.25;    // 防止螺旋死锁的最大帧时间

    /**
     * 构造函数
     * @param config 基础配置
     * @param systems [Optional] 注入的子系统，未传入则使用默认实现
     */
    constructor(config: EngineConfig, systems: EngineSystems = {}) {
        this.config = config;
        this.state = this.createInitialState();
        this.setupDOM();

        // 1. 初始化事件总线
        this.events = new EventBus();

        // 2. 初始化核心系统 (优先使用注入的实例)
        // [World] 支持替换底层数据结构
        this.world = systems.world || new World(config.chunkSize || 128);
        
        // [Camera]
        this.camera = systems.camera || new Camera();
        
        // [Assets]
        this.assets = systems.assets || new AssetSystem(this.events);
        
        // [Renderer] 需要 Canvas 和 Camera
        // 如果外部没传，我们实例化具体的 Renderer 类
        this.renderer = systems.renderer || new Renderer(this.canvas, this.camera, this);
        
        // [Input] 需要 Canvas 和 Camera
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
     * 顺序决定了绘制层级：背景 -> 网格 -> 方块
     */
    private setupDefaultLayers() {
        // 通过接口访问 layers 并添加图层
        this.renderer.layers.add(new BackgroundLayer(this));
        this.renderer.layers.add(new GridLayer(this));
        this.renderer.layers.add(new BlockLayer(this));
    }

    private setupRenderTriggers() {
        const render = () => this.requestRender();
        // 任何可能导致画面变化的事件都应触发 requestRender
        this.events.on('input:mousemove', render);
        this.events.on('input:wheel', render);
        this.events.on('state:change', render);
        this.events.on('asset:loaded', render);
        this.events.on('history:undo', render);
        this.events.on('history:redo', render);
        this.events.on('tool:set', render);
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
        // 滚轮缩放
        this.events.on('input:wheel', (e, screenPos) => {
            const zoomFactor = Math.exp(-e.deltaY * 0.001);
            this.camera.zoomBy(zoomFactor, screenPos.x, screenPos.y);
        });

        // 空格键/抓手拖拽画布
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

        // 状态同步
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

    // --- 商业级游戏循环 (Fixed Time Step) ---
    private loop(timestamp: number) {
        if (!this.isRunning) return;

        // 1. 计算时间增量 (秒)
        let frameTime = (timestamp - this.lastTime) / 1000;
        this.lastTime = timestamp;

        // 安全限制：避免后台挂起后切回导致 delta 巨大
        if (frameTime > this.MAX_FRAME_TIME) {
            frameTime = this.MAX_FRAME_TIME;
        }

        this.accumulator += frameTime;

        // 2. 固定步长更新逻辑 (Fixed Update)
        // 保证物理/逻辑运算在任何帧率下速度一致
        while (this.accumulator >= this.FIXED_TIME_STEP) {
            this.fixedUpdate(this.FIXED_TIME_STEP);
            this.accumulator -= this.FIXED_TIME_STEP;
        }

        // 3. 渲染 (Variable Render)
        // 渲染尽可能快地执行
        this.render();

        requestAnimationFrame(this._boundLoop);
    }

    /**
     * 逻辑更新：处理物理、相机平滑等
     */
    private fixedUpdate(dt: number) {
        // 相机更新
        const wasCameraMoving = this.camera.isMoving();
        this.camera.update(dt);
        const isCameraMoving = this.camera.isMoving();

        if (isCameraMoving || wasCameraMoving) {
            this.isDirty = true;
        }

        // 插件更新
        this.plugins.forEach(p => p.onUpdate && p.onUpdate(dt));
    }

    /**
     * 渲染：处理重绘
     */
    private render() {
        if (this.isDirty) {
            // 核心绘制 (委托给 Renderer -> Layers)
            this.renderer.draw(); 
            
            // 后处理 / 插件渲染钩子 (Post-Processing)
            // 虽然有了 Layer 系统，但这里保留钩子以支持不走 Layer 的简单 UI 绘制
            const ctx = this.renderer.ctx;
            ctx.save();
            const dpr = window.devicePixelRatio || 1;
            
            // 重新应用变换矩阵，方便插件直接在世界坐标系绘制
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
        this.renderer.layers.clear(); // 清理所有图层
        this.resizeObserver.disconnect();
        this.plugins.forEach(p => p.onDestroy && p.onDestroy());
        this.canvas.remove();
    }
}