// src/engine/utils/MathUtils.ts
/**
 * [FIX] 数学工具库 - 统一处理浮点数精度和坐标对齐
 */
export class MathUtils {
  // [FIX] 引入极小值常量，解决浮点数边界判定问题
  public static readonly EPSILON = 0.00001;

  /**
   * 网格吸附计算
   * @param val 原始坐标
   * @param gridSize 网格大小
   */
  public static snap(val: number, gridSize: number): number {
    return Math.floor(val / gridSize) * gridSize;
  }

  /**
   * 浮点数相等判断
   */
  public static equals(a: number, b: number): boolean {
    return Math.abs(a - b) < this.EPSILON;
  }

  /**
   * 生成唯一ID (简单商业级实现，推荐后续换成 uuid 库)
   */
  public static generateId(prefix: string = 'obj'): string {
    return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
  }
}