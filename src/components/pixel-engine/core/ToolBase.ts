// src/engine/core/ToolBase.ts
import { IEngine, Vec2 } from '../types';
import { MathUtils } from '../utils/MathUtils';

export abstract class BaseTool {
  constructor(protected engine: IEngine) {}

  abstract name: string;
  
  // 生命周期钩子
  abstract onActivate(): void;
  abstract onDeactivate(): void;

  // 输入事件 (返回 true 表示消耗了事件，阻止冒泡)
  abstract onMouseDown(worldPos: Vec2, e: MouseEvent): boolean;
  abstract onMouseMove(worldPos: Vec2, e: MouseEvent): boolean;
  abstract onMouseUp(worldPos: Vec2, e: MouseEvent): boolean;

  abstract onRender(ctx: CanvasRenderingContext2D): void;

  // [New] 通用辅助方法：获取对齐后的网格坐标
  protected getSnappedPos(pos: Vec2): Vec2 {
      const size = this.getGridSize();
      return {
          x: MathUtils.snap(pos.x, size),
          y: MathUtils.snap(pos.y, size)
      };
  }

  // [Fixed] 这里读取 config.gridSize，而不是 world.chunkSize
  protected getGridSize(): number {
    return this.engine.config.gridSize || 20; 
  }
}