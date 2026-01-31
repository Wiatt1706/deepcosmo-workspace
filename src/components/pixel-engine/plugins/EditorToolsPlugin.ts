// src/engine/plugins/EditorToolsPlugin.ts
import { IPlugin, IEngine, Vec2, ToolType } from '../types';
import { BaseTool } from '../core/ToolBase';
import { Layer, RenderContext } from '../core/Layer';
import { HandTool } from '../tools/HandTool';

class ToolPreviewLayer extends Layer {
    constructor(engine: IEngine, private plugin: EditorToolsPlugin) {
        super(engine, 'tool-preview', 200); 
    }
    render({ ctx }: RenderContext) {
        // [Key Change] 渲染当前实际工作的工具 (可能是临时替换的 HandTool)
        const tool = this.plugin.getActiveTool();
        if (tool) tool.onRender(ctx);
    }
}

export class EditorToolsPlugin implements IPlugin {
    name = 'EditorTools';
    private engine!: IEngine;
    private tools: Map<string, BaseTool> = new Map();
    
    // [Key Change] 区分“选中的工具”和“实际激活的工具”
    private selectedTool: BaseTool | null = null; // 用户在 UI 上选的 (Brush)
    private overrideTool: BaseTool | null = null; // 临时覆盖的 (Hand via Space)
    
    private toolLayer: ToolPreviewLayer | null = null;
    
    constructor(private initialTools: BaseTool[] = []) {}

    onInit(engine: IEngine) {
        this.engine = engine;
        this.initialTools.forEach(tool => this.registerTool(tool));
        this.toolLayer = new ToolPreviewLayer(engine, this);
        engine.renderer.layers.add(this.toolLayer);

        // 绑定输入
        engine.events.on('input:mousedown', this.handleMouseDown);
        engine.events.on('input:mousemove', this.handleMouseMove);
        engine.events.on('input:mouseup', this.handleMouseUp);
        
        // 绑定指令
        engine.events.on('tool:set', (name) => this.setSelectedTool(name));
        engine.events.on('input:keydown', this.handleKeydown);
        engine.events.on('input:keyup', this.handleKeyup); // [New] 监听松开

        // 初始化
        this.setSelectedTool(engine.state.currentTool);
    }

    onDestroy() {
        if (this.toolLayer) this.engine.renderer.layers.remove(this.toolLayer.name);
    }

    public registerTool(tool: BaseTool) {
        if (this.tools.has(tool.name)) return;
        this.tools.set(tool.name, tool);
    }

    // 获取当前真正干活的工具
    public getActiveTool() {
        return this.overrideTool || this.selectedTool;
    }

    // --- 核心状态管理 ---

    private setSelectedTool(name: ToolType) {
        const tool = this.tools.get(name);
        if (!tool) return;

        // 1. 如果有旧工具，先清理现场 (Auto-Commit)
        if (this.selectedTool) {
            this.selectedTool.onDeactivate();
        }

        // 2. 切换新工具
        this.selectedTool = tool;
        
        // 3. 只有在没有覆盖工具时，才激活新工具
        if (!this.overrideTool) {
            this.selectedTool.onActivate();
        }

        // 4. 更新 UI 状态
        this.engine.state.currentTool = name;
        this.engine.requestRender();
    }

    // --- 临时工具逻辑 (Spacebar Logic) ---

    private setOverrideTool(name: ToolType | null) {
        if (name === null) {
            // 取消覆盖
            if (this.overrideTool) {
                this.overrideTool.onDeactivate();
                this.overrideTool = null;
                
                // 恢复原工具
                if (this.selectedTool) {
                    this.selectedTool.onActivate();
                    // 恢复鼠标样式
                    // 注意：这里可能需要具体的工具重新设置一下 cursor，但 onActivate 通常会做
                }
            }
        } else {
            // 启用覆盖 (例如按下空格)
            const tool = this.tools.get(name);
            if (tool && tool !== this.overrideTool) {
                // 暂停原工具 (注意：不是 Deactivate，我们不希望 Brush 提交或清理，只是暂时冻结)
                // 但为了简单和安全，目前大部分软件逻辑是：临时切换不触发原工具的 Deactivate，只接管 Input
                // 可是 Cursor 需要变。
                
                // 方案：让 overrideTool 接管，覆盖原工具
                if (this.overrideTool) this.overrideTool.onDeactivate();
                
                // 此时不调用 selectedTool.onDeactivate()，因为它只是“暂停”
                // 但是我们需要改变光标，所以 overrideTool.onActivate() 会负责设置新光标
                
                this.overrideTool = tool;
                this.overrideTool.onActivate();
            }
        }
        this.engine.requestRender();
    }

    // --- 事件处理 ---

    private handleKeydown = (e: KeyboardEvent) => {
        // [New] 只要按下空格，且当前没在输入框里，就切到 Hand
        if (e.code === 'Space' && !this.isInputActive(e)) {
            if (!this.overrideTool) {
                this.setOverrideTool('hand');
            }
            return; // 吞掉空格事件，不传给 InputSystem (虽然 InputSystem 也会收到，但我们不再依赖它)
        }

        // 快捷键切工具
        const keys = this.engine.input.keys;
        if (keys.matches('tool:brush', e)) this.engine.events.emit('tool:set', 'brush');
        else if (keys.matches('tool:eraser', e)) this.engine.events.emit('tool:set', 'eraser');
        else if (keys.matches('tool:hand', e)) this.engine.events.emit('tool:set', 'hand');
        else if (keys.matches('tool:rectangle', e)) this.engine.events.emit('tool:set', 'rectangle');
        else if (keys.matches('tool:rectangle-select', e)) this.engine.events.emit('tool:set', 'rectangle-select');
    };

    private handleKeyup = (e: KeyboardEvent) => {
        if (e.code === 'Space') {
            this.setOverrideTool(null); // 松开空格，恢复
        }
    };

    private handleMouseDown = (worldPos: Vec2, e: MouseEvent) => {
        const tool = this.getActiveTool();
        if (tool) {
            const processed = tool.onMouseDown(worldPos, e);
            if (processed) this.engine.requestRender();
        }
    };

    private handleMouseMove = (worldPos: Vec2, e: MouseEvent) => {
        const tool = this.getActiveTool();
        if (tool) {
            tool.onMouseMove(worldPos, e);
            // 这里不强制 render，由工具内部决定
        }
    };

    private handleMouseUp = (worldPos: Vec2, e: MouseEvent) => {
        const tool = this.getActiveTool();
        if (tool) {
            tool.onMouseUp(worldPos, e);
            this.engine.requestRender();
        }
    };
    
    // 辅助：判断是否在打字
    private isInputActive(e: Event) {
        const target = e.target as HTMLElement;
        return target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
    }
}