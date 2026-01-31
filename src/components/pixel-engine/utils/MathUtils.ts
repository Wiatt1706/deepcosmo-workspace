// src/engine/utils/MathUtils.ts

export class MathUtils {
    // 容差值，用于解决浮点数精度问题 (e.g. 19.9999999 -> 20)
    public static readonly EPSILON = 0.0001;

    public static generateId(prefix: string = 'obj'): string {
        return `${prefix}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * 网格吸附 (Snap to Grid)
     * 修复了负数坐标的吸附逻辑，确保 -20 ~ 0 之间的坐标被正确吸附到 -20 而不是 0
     */
    public static snap(value: number, size: number): number {
        // 先加上 EPSILON 防止 19.99999 被 floor 成 19
        // 使用 Math.floor 确保负数也能向左对齐 (e.g. floor(-0.5) = -1)
        return Math.floor((value + MathUtils.EPSILON) / size) * size;
    }

    /**
     * 限制数值范围
     */
    public static clamp(value: number, min: number, max: number): number {
        return Math.max(min, Math.min(max, value));
    }

    /**
     * 线性插值 (Lerp)
     */
    public static lerp(start: number, end: number, t: number): number {
        return start * (1 - t) + end * t;
    }
}