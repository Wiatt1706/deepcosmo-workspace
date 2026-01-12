// src/engine/plugins/EditorToolsPlugin.ts
import { IPlugin, IEngine, Vec2, ToolType } from '../types';
import { BaseTool } from '../core/ToolBase';
import { 
    BrushTool, 
    EraserTool, 
    RectangleTool, 
    PortalTool 
} from '../tools/StandardTools';

export class EditorToolsPlugin implements IPlugin {
  name = 'EditorTools';
  private engine!: IEngine;
  
  private tools: Map<string, BaseTool> = new Map();
  private currentTool: BaseTool | null = null;
  
  onInit(engine: IEngine) {
    this.engine = engine;
    
    // 初始化时同步状态
    this.engine.state.currentTool = 'brush'; 

    this.registerTool(new BrushTool(engine));
    this.registerTool(new EraserTool(engine));
    this.registerTool(new RectangleTool(engine));
    this.registerTool(new PortalTool(engine));

    // Input Events
    engine.events.on('input:mousedown', this.handleMouseDown);
    engine.events.on('input:mousemove', this.handleMouseMove);
    engine.events.on('input:mouseup', this.handleMouseUp);

    // Command Events
    engine.events.on('tool:set', (name) => this.switchTool(name));
    
    // Initialize tool
    this.switchTool(engine.state.currentTool);
  }

  private registerTool(tool: BaseTool) {
      this.tools.set(tool.name, tool);
  }

  private switchTool(name: ToolType) {
      if (name === 'hand') {
          if (this.currentTool) {
              this.currentTool.onDeactivate();
              this.currentTool = null;
          }
          this.engine.canvas.style.cursor = 'grab';
          this.engine.state.currentTool = 'hand';
          return;
      }

      const tool = this.tools.get(name);
      if (tool) {
          if (this.currentTool) this.currentTool.onDeactivate();
          this.currentTool = tool;
          this.currentTool.onActivate();
          this.engine.state.currentTool = name;
      }
  }

  private handleMouseDown = (worldPos: Vec2, e: MouseEvent) => {
      if (this.engine.input.isSpacePressed) {
          this.engine.canvas.style.cursor = 'grabbing';
          return;
      }
      if (this.currentTool) {
          this.currentTool.onMouseDown(worldPos, e);
      }
  };

  private handleMouseMove = (worldPos: Vec2, e: MouseEvent) => {
      if (this.engine.input.isSpacePressed) return;
      if (this.currentTool) {
          this.currentTool.onMouseMove(worldPos, e);
      }
  };

  private handleMouseUp = (worldPos: Vec2, e: MouseEvent) => {
      if (this.currentTool) {
          this.currentTool.onMouseUp(worldPos, e);
      }
      if (this.engine.input.isSpacePressed) {
          this.engine.canvas.style.cursor = 'grab';
      } else if (this.currentTool) {
          this.currentTool.onActivate();
      }
  };

  onRender(ctx: CanvasRenderingContext2D) {
      if (!this.engine.input.isSpacePressed && this.currentTool) {
          this.currentTool.onRender(ctx);
      }
  }
}