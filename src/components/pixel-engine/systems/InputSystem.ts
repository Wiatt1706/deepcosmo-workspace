// src/engine/systems/InputSystem.ts
import { Camera } from '../core/Camera';
import { IEventBus, Vec2 } from '../types';
import { KeybindingSystem } from './KeybindingSystem';

export class InputSystem {
    public mouseScreen: Vec2 = { x: 0, y: 0 };
    public mouseWorld: Vec2 = { x: 0, y: 0 };
    public isDragging: boolean = false;
    // [Deleted] isSpacePressed 已被移除，不再由 InputSystem 管理

    // 快捷键子系统
    public keys: KeybindingSystem;

    private rectCache: DOMRect | null = null;
    private _handlers: { [key: string]: (e: any) => void } = {};

    constructor(
        private canvas: HTMLCanvasElement,
        private camera: Camera,
        private events: IEventBus
    ) {
        this.keys = new KeybindingSystem(events);
        this.setupDefaultKeybindings();

        this.updateRectCache();
        this.bindEvents();
    }

    private setupDefaultKeybindings() {
        // History
        this.keys.register('history:undo', ['mod', 'z'], 'Undo');
        this.keys.register('history:redo', ['mod', 'shift', 'z'], 'Redo');
        
        // Tools
        this.keys.register('tool:brush', ['b'], 'Brush Tool');
        this.keys.register('tool:eraser', ['e'], 'Eraser Tool');
        this.keys.register('tool:hand', ['h'], 'Hand Tool');
        this.keys.register('tool:rectangle', ['r'], 'Rectangle Tool');
        this.keys.register('tool:rectangle-select', ['m'], 'Select Tool'); // M for Marquee
        this.keys.register('tool:portal', ['p'], 'Portal Tool');
        
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
            // 不再处理 Space 状态，只负责分发事件
            this.events.emit('input:keydown', e);
        };

        this._handlers.keyup = (e: KeyboardEvent) => {
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
            // 仅左键视为主要交互拖拽
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
            if (e.ctrlKey || e.metaKey) {
                e.preventDefault();
            }
            this.events.emit('input:wheel', e, this.mouseScreen);
        };

        // Window Listeners
        window.addEventListener('keydown', this._handlers.keydown);
        window.addEventListener('keyup', this._handlers.keyup);
        window.addEventListener('mousemove', this._handlers.mousemove);
        window.addEventListener('mouseup', this._handlers.mouseup);
        
        // Canvas Listeners
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