// src/engine/core/ToolBase.ts
import { IEngine, Vec2 } from '../types';

/**
 * [FIX] 抽象工具基类
 * 所有的交互工具都必须继承此类，确保生命周期管理一致。
 */
export abstract class BaseTool {
  constructor(protected engine: IEngine) {}

  /** 工具名称，用于注册和切换 */
  abstract name: string;

  /**
   * 当工具被激活时触发
   * 用于初始化状态，如设置光标样式
   */
  abstract onActivate(): void;

  /**
   * 当工具被停用时触发
   * 用于清理状态，如删除临时预览层
   */
  abstract onDeactivate(): void;

  /**
   * 鼠标按下事件
   * @returns boolean 如果返回 true，表示事件已被工具消费，不再向后传递（如阻止画布拖拽）
   */
  abstract onMouseDown(worldPos: Vec2, e: MouseEvent): boolean;

  /** 鼠标移动事件 */
  abstract onMouseMove(worldPos: Vec2, e: MouseEvent): boolean;

  /** 鼠标抬起事件 */
  abstract onMouseUp(worldPos: Vec2, e: MouseEvent): boolean;

  /**
   * 渲染工具特有的 UI (Overlay)
   * 例如：画笔的虚影、矩形选框的线条
   */
  abstract onRender(ctx: CanvasRenderingContext2D): void;

  // --- 通用辅助方法 ---

  protected getGridSize(): number {
    // 假设 GridSize 暂时是固定的，后续可以从 Config 获取
    return 20; 
  }
}