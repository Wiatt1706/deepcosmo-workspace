// src/engine/systems/InputSystem.ts
import { Camera } from '../core/Camera';
import { IEventBus, Vec2 } from '../types';
import { KeybindingSystem } from './KeybindingSystem';

export class InputSystem {
    public mouseScreen: Vec2 = { x: 0, y: 0 };
    public mouseWorld: Vec2 = { x: 0, y: 0 };
    public isDragging: boolean = false;

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
        // --- History (关键修复) ---
        // 注册 Ctrl+Z / Ctrl+Shift+Z
        this.keys.register('history:undo', ['mod', 'z'], 'Undo');
        this.keys.register('history:redo', ['mod', 'shift', 'z'], 'Redo');
        
        // --- Tools ---
        this.keys.register('tool:brush', ['b'], 'Brush Tool');
        this.keys.register('tool:eraser', ['e'], 'Eraser Tool');
        this.keys.register('tool:hand', ['h'], 'Hand Tool');
        this.keys.register('tool:rectangle', ['r'], 'Rectangle Tool');
        this.keys.register('tool:rectangle-select', ['m'], 'Select Tool'); // M for Marquee
        this.keys.register('tool:portal', ['p'], 'Portal Tool');
        
        // --- View ---
        this.keys.register('view:reset', ['mod', '0'], 'Reset View');
        
        // --- Selection ---
        this.keys.register('selection:delete', ['delete'], 'Delete Selection');
        this.keys.register('selection:delete-back', ['backspace'], 'Delete Selection');
        this.keys.register('selection:cancel', ['escape'], 'Cancel Selection');
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
        // [Key Change] 键盘事件必须绑定到 window，否则用户必须先点击 canvas 才能触发
        this._handlers.keydown = (e: KeyboardEvent) => {
            // 忽略输入框内的按键
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

            // 1. 优先交给 KeybindingSystem 进行语义匹配
            this.handleKeyShortcuts(e);
            
            // 2. 依然分发原始事件 (供 SelectionTool 移动等逻辑使用)
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
            // 防止浏览器默认缩放 (Ctrl+Wheel)
            if (e.ctrlKey || e.metaKey) {
                e.preventDefault();
            }
            this.events.emit('input:wheel', e, this.mouseScreen);
        };

        // Window Listeners (Keyboard)
        window.addEventListener('keydown', this._handlers.keydown);
        window.addEventListener('keyup', this._handlers.keyup);
        
        // Window Listeners (Mouse - 即使移出 Canvas 也能响应)
        window.addEventListener('mousemove', this._handlers.mousemove);
        window.addEventListener('mouseup', this._handlers.mouseup);
        
        // Canvas Listeners
        this.canvas.addEventListener('mousedown', this._handlers.mousedown);
        this.canvas.addEventListener('dblclick', this._handlers.dblclick);
        this.canvas.addEventListener('wheel', this._handlers.wheel as any, { passive: false });
    }

    /**
     * [New] 核心修复：在这里统一派发快捷键事件
     */
    private handleKeyShortcuts(e: KeyboardEvent) {
        // History
        if (this.keys.matches('history:undo', e)) {
            e.preventDefault();
            this.events.emit('history:undo');
            return;
        }
        if (this.keys.matches('history:redo', e)) {
            e.preventDefault();
            this.events.emit('history:redo');
            return;
        }

        // Tools
        if (this.keys.matches('tool:brush', e)) this.events.emit('tool:set', 'brush');
        else if (this.keys.matches('tool:eraser', e)) this.events.emit('tool:set', 'eraser');
        else if (this.keys.matches('tool:hand', e)) this.events.emit('tool:set', 'hand');
        else if (this.keys.matches('tool:rectangle', e)) this.events.emit('tool:set', 'rectangle');
        else if (this.keys.matches('tool:rectangle-select', e)) this.events.emit('tool:set', 'rectangle-select');
        else if (this.keys.matches('tool:portal', e)) this.events.emit('tool:set', 'portal');
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