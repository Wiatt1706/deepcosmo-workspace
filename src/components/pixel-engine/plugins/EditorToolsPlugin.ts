// src/engine/plugins/EditorToolsPlugin.ts
import { IPlugin, IEngine, Vec2, ToolType } from '../types';
import { BaseTool } from '../core/ToolBase';

export class EditorToolsPlugin implements IPlugin {
  name = 'EditorTools';
  private engine!: IEngine;
  
  private tools: Map<string, BaseTool> = new Map();
  private currentTool: BaseTool | null = null;
  
  // [Change] 依赖注入：工具列表由外部传入
  constructor(private initialTools: BaseTool[] = []) {}

  onInit(engine: IEngine) {
    this.engine = engine;
    
    // 1. 注册传入的工具
    this.initialTools.forEach(tool => this.registerTool(tool));

    // Input Events
    engine.events.on('input:mousedown', this.handleMouseDown);
    engine.events.on('input:mousemove', this.handleMouseMove);
    engine.events.on('input:mouseup', this.handleMouseUp);
    engine.events.on('tool:set', (name) => this.switchTool(name));
    
    // 初始化默认工具
    this.switchTool(engine.state.currentTool);
  }

  // [Public API] 允许外部动态注册工具
  public registerTool(tool: BaseTool) {
      if (this.tools.has(tool.name)) {
          return;
      }
      this.tools.set(tool.name, tool);
  }

  private switchTool(name: ToolType) {
      // Hand 逻辑 (View 模式)
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

  private handleMouseDown = (worldPos: Vec2, e: MouseEvent) => {
      if (this.engine.input.isSpacePressed) return; 
      
      if (this.currentTool) {
          const processed = this.currentTool.onMouseDown(worldPos, e);
          if (processed) this.engine.requestRender(); 
      }
  };

  private handleMouseMove = (worldPos: Vec2, e: MouseEvent) => {
      if (this.engine.input.isSpacePressed) return;
      
      if (this.currentTool) {
          const processed = this.currentTool.onMouseMove(worldPos, e);
          // 移动时通常需要重绘 Overlay (比如画笔光标)
          this.engine.requestRender(); 
      }
  };

  private handleMouseUp = (worldPos: Vec2, e: MouseEvent) => {
      if (this.currentTool) {
          this.currentTool.onMouseUp(worldPos, e);
          this.engine.requestRender();
      }
  };

  onRender(ctx: CanvasRenderingContext2D) {
      if (!this.engine.input.isSpacePressed && this.currentTool) {
          this.currentTool.onRender(ctx);
      }
  }
}