import { IEngine, Vec2 } from '../types';

export abstract class BaseTool {
  constructor(protected engine: IEngine) {}

  abstract name: string;
  abstract onActivate(): void;
  abstract onDeactivate(): void;

  abstract onMouseDown(worldPos: Vec2, e: MouseEvent): boolean;
  abstract onMouseMove(worldPos: Vec2, e: MouseEvent): boolean;
  abstract onMouseUp(worldPos: Vec2, e: MouseEvent): boolean;

  /**
   * 渲染工具 UI
   * ctx 已经经过 Camera 变换，原点在画布中心，且已缩放和平移。
   * 可以直接使用 worldPos 进行绘制。
   */
  abstract onRender(ctx: CanvasRenderingContext2D): void;

  protected getGridSize(): number {
    return 20; // 后续可以改为 this.engine.world.chunkSize 或 config
  }
}