import { Camera } from '../core/Camera';
import { IEventBus, Vec2 } from '../types';
import { KeybindingSystem } from './KeybindingSystem';

export class InputSystem {
    public mouseScreen: Vec2 = { x: 0, y: 0 };
    public mouseWorld: Vec2 = { x: 0, y: 0 };
    public isDragging: boolean = false;
    public isSpacePressed: boolean = false;

    // [New] 快捷键系统
    public keys: KeybindingSystem;

    private rectCache: DOMRect | null = null;
    private _handlers: { [key: string]: (e: any) => void } = {};

    constructor(
        private canvas: HTMLCanvasElement,
        private camera: Camera,
        private events: IEventBus
    ) {
        // 初始化快捷键子系统
        this.keys = new KeybindingSystem(events);
        this.setupDefaultKeybindings();

        this.updateRectCache();
        this.bindEvents();
    }

    /**
     * [Config] 注册默认快捷键
     * 这里定义了引擎的基础交互规范
     */
    private setupDefaultKeybindings() {
        // History
        this.keys.register('history:undo', ['mod', 'z'], 'Undo');
        this.keys.register('history:redo', ['mod', 'shift', 'z'], 'Redo');
        
        // Tools
        this.keys.register('tool:brush', ['b'], 'Brush Tool');
        this.keys.register('tool:eraser', ['e'], 'Eraser Tool');
        this.keys.register('tool:hand', ['h'], 'Hand Tool');
        this.keys.register('tool:rectangle', ['r'], 'Rectangle Tool');
        
        // View
        this.keys.register('view:reset', ['mod', '0'], 'Reset View');
    }

    public updateRectCache() {
        if (this.canvas) {
            this.rectCache = this.canvas.getBoundingClientRect();
        }
    }

    private updatePos(clientX: number, clientY: number) {
        if (!this.rectCache) {
            this.updateRectCache();
        }
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
            // 1. 全局状态追踪
            if (e.code === 'Space') this.isSpacePressed = true;
            
            // 2. 触发 Engine 事件
            this.events.emit('input:keydown', e);

            // 3. [New] 检查快捷键
            // 这种方式让所有 Plugin 都可以只监听同一个 'input:keydown'，
            // 然后调用 input.keys.matches('action', e) 来判断，极大简化了逻辑
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
            // [Fix] 只有左键才算 Dragging，避免右键触发画笔
            if (e.button === 0) {
                this.isDragging = true;
            }
            this.updatePos(e.clientX, e.clientY);
            this.events.emit('input:mousedown', this.mouseWorld, e);
        };
        
        this._handlers.dblclick = (e: MouseEvent) => {
            this.updatePos(e.clientX, e.clientY);
            this.events.emit('input:dblclick', this.mouseWorld, e);
        };
        
        this._handlers.wheel = (e: WheelEvent) => {
            // [Interaction] 阻止浏览器默认的缩放行为 (Ctrl+Wheel)
            if (e.ctrlKey || e.metaKey) {
                e.preventDefault();
            }
            this.events.emit('input:wheel', e, this.mouseScreen);
        };

        // Window 级监听
        window.addEventListener('keydown', this._handlers.keydown);
        window.addEventListener('keyup', this._handlers.keyup);
        window.addEventListener('mousemove', this._handlers.mousemove);
        window.addEventListener('mouseup', this._handlers.mouseup);
        
        // Canvas 级监听
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