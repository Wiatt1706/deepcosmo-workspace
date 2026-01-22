import { IPlugin, IEngine, Vec2, ToolType } from '../types';
import { BaseTool } from '../core/ToolBase';
import { Layer, RenderContext } from '../core/Layer';

/**
 * [Internal Layer] 工具预览图层
 * 专门用于渲染当前工具的 UI（如：画笔的幽灵方块、选框线条、橡皮擦范围）。
 * 这个类是私有的，只服务于 EditorToolsPlugin，外部无需感知。
 */
class ToolPreviewLayer extends Layer {
    constructor(engine: IEngine, private plugin: EditorToolsPlugin) {
        // zIndex: 200 确保工具 UI 覆盖在网格(0)和方块(10)之上
        super(engine, 'tool-preview', 200); 
    }

    render({ ctx }: RenderContext) {
        const tool = this.plugin.getCurrentTool();
        const isSpacePressed = this.engine.input.isSpacePressed;

        // 只有在非漫游模式（Space未按下）且有激活工具时才渲染
        // 漫游模式下，我们通常只想看干净的画布
        if (tool && !isSpacePressed) {
            // 工具通常只需要 ctx 来绘制路径
            // 此时 ctx 已经被 Engine 变换过（Translate/Scale），可以直接使用世界坐标绘制
            tool.onRender(ctx);
        }
    }
}

export class EditorToolsPlugin implements IPlugin {
    name = 'EditorTools';
    private engine!: IEngine;
    
    private tools: Map<string, BaseTool> = new Map();
    private currentTool: BaseTool | null = null;
    
    // 持有图层实例，以便在插件销毁时从渲染管线中移除
    private toolLayer: ToolPreviewLayer | null = null;
    
    // [Refactor] 通过构造函数注入工具列表，保持插件纯净
    constructor(private initialTools: BaseTool[] = []) {}

    onInit(engine: IEngine) {
        this.engine = engine;
        
        // 1. 注册传入的工具
        this.initialTools.forEach(tool => this.registerTool(tool));

        // 2. [New Architecture] 创建并注册工具渲染层
        // 以前我们依赖 Engine 的 loop 回调 onRender，现在我们走标准的 Layer 流程
        this.toolLayer = new ToolPreviewLayer(engine, this);
        engine.renderer.layers.add(this.toolLayer);

        // 3. 绑定输入事件 (Input Events)
        engine.events.on('input:mousedown', this.handleMouseDown);
        engine.events.on('input:mousemove', this.handleMouseMove);
        engine.events.on('input:mouseup', this.handleMouseUp);
        
        // 4. 监听工具切换指令 (Command Events)
        engine.events.on('tool:set', (name) => this.switchTool(name));
        
        // 5. [New] 绑定快捷键切换工具 (Hotkey Events)
        engine.events.on('input:keydown', this.handleKeydown);
        
        // 初始化当前工具
        this.switchTool(engine.state.currentTool);
    }

    onDestroy() {
        // 插件销毁时，务必清理图层，防止内存泄漏或报错
        if (this.toolLayer) {
            this.engine.renderer.layers.remove(this.toolLayer.name);
        }
    }

    // --- 公开 API (供 ToolPreviewLayer 使用) ---
    public getCurrentTool() {
        return this.currentTool;
    }

    public registerTool(tool: BaseTool) {
        if (this.tools.has(tool.name)) return;
        this.tools.set(tool.name, tool);
    }

    // --- 内部逻辑 ---

    /**
     * [Refactor] 快捷键处理
     * 使用 KeybindingSystem 匹配动作
     */
    private handleKeydown = (e: KeyboardEvent) => {
        const keys = this.engine.input.keys;

        // 这里的动作名称 (如 'tool:brush') 必须与 InputSystem 中注册的一致
        if (keys.matches('tool:brush', e)) {
            this.engine.events.emit('tool:set', 'brush');
        } 
        else if (keys.matches('tool:eraser', e)) {
            this.engine.events.emit('tool:set', 'eraser');
        }
        else if (keys.matches('tool:hand', e)) {
            this.engine.events.emit('tool:set', 'hand');
        }
        else if (keys.matches('tool:rectangle', e)) {
            this.engine.events.emit('tool:set', 'rectangle');
        }
    };

    private switchTool(name: ToolType) {
        // 特殊处理：Hand 模式
        // Hand 模式在 InputSystem 层级有特殊处理（空格键），这里主要是 UI 状态切换
        if (name === 'hand') {
            this.deactivateCurrent();
            this.engine.canvas.style.cursor = 'grab';
            this.engine.state.currentTool = 'hand';
            this.engine.requestRender(); 
            return;
        }

        const tool = this.tools.get(name);
        if (tool) {
            this.deactivateCurrent();
            this.currentTool = tool;
            this.currentTool.onActivate();
            
            // 更新 Engine 状态，通知 UI 层 (React) 高亮对应按钮
            this.engine.state.currentTool = name;
            this.engine.requestRender(); 
        }
    }

    private deactivateCurrent() {
        if (this.currentTool) {
            this.currentTool.onDeactivate();
            this.currentTool = null;
        }
    }

    // --- 事件分发 (Event Dispatching) ---

    private handleMouseDown = (worldPos: Vec2, e: MouseEvent) => {
        // 如果按住了空格（漫游模式），则不触发工具逻辑
        if (this.engine.input.isSpacePressed) return; 
        
        if (this.currentTool) {
            const processed = this.currentTool.onMouseDown(worldPos, e);
            // 如果工具处理了事件（返回 true），则请求重绘
            if (processed) this.engine.requestRender(); 
        }
    };

    private handleMouseMove = (worldPos: Vec2, e: MouseEvent) => {
        if (this.engine.input.isSpacePressed) return;
        
        if (this.currentTool) {
            const processed = this.currentTool.onMouseMove(worldPos, e);
            // 移动时通常需要重绘 ToolPreviewLayer (比如画笔光标跟随)
            this.engine.requestRender(); 
        }
    };

    private handleMouseUp = (worldPos: Vec2, e: MouseEvent) => {
        if (this.currentTool) {
            this.currentTool.onMouseUp(worldPos, e);
            this.engine.requestRender();
        }
    };
}