import { BaseTool } from '../core/ToolBase';
import { Vec2 } from '../types';
import { MathUtils } from '../utils/MathUtils';

export class SelectionTool extends BaseTool {
    name = 'rectangle-select'; // 工具名称

    private startPos: Vec2 | null = null;
    private isCreating: boolean = false;
    private isMoving: boolean = false;
    private initialSelectionPos: Vec2 | null = null;

    onActivate() {
        this.engine.canvas.style.cursor = 'crosshair';
    }

    onDeactivate() {
        this.engine.selection.clear();
        this.resetState();
    }

    private resetState() {
        this.startPos = null;
        this.isCreating = false;
        this.isMoving = false;
        this.initialSelectionPos = null;
    }

    onMouseDown(pos: Vec2, e: MouseEvent): boolean {
        const selection = this.engine.selection.currentSelection;
        
        // 1. 检查是否点在现有选区内 -> 移动模式
        if (selection && 
            pos.x >= selection.x && pos.x <= selection.x + selection.w &&
            pos.y >= selection.y && pos.y <= selection.y + selection.h) {
            
            this.isMoving = true;
            this.startPos = pos; // 记录鼠标起始点
            this.initialSelectionPos = { x: selection.x, y: selection.y }; // 记录选区起始点
            this.engine.canvas.style.cursor = 'move';
            return true;
        }

        // 2. 否则 -> 创建模式
        this.engine.selection.clear(); // 清除旧选区
        this.isCreating = true;
        this.startPos = pos;
        return true;
    }

    onMouseMove(pos: Vec2): boolean {
        // [Interaction] 鼠标悬停时的光标提示
        if (!this.isCreating && !this.isMoving) {
            const selection = this.engine.selection.currentSelection;
            if (selection && 
                pos.x >= selection.x && pos.x <= selection.x + selection.w &&
                pos.y >= selection.y && pos.y <= selection.y + selection.h) {
                this.engine.canvas.style.cursor = 'move';
            } else {
                this.engine.canvas.style.cursor = 'crosshair';
            }
        }

        // 1. 创建模式：更新选区矩形
        if (this.isCreating && this.startPos) {
            const rect = this.calcRect(this.startPos, pos);
            this.engine.selection.setSelection(rect);
            return true;
        }

        // 2. 移动模式：步进式移动选区
        if (this.isMoving && this.startPos && this.initialSelectionPos) {
            const gridSize = this.getGridSize();
            
            // 计算鼠标位移
            const dx = pos.x - this.startPos.x;
            const dy = pos.y - this.startPos.y;

            // [Step-based] 关键：位移量必须是对齐网格的
            // 比如 Grid=20，哪怕鼠标移了 15px，选区也不动；移了 22px，选区动 20px
            const stepX = MathUtils.snap(dx, gridSize);
            const stepY = MathUtils.snap(dy, gridSize);

            const selection = this.engine.selection.currentSelection!;
            
            // 更新选区位置 (基于初始位置 + 步进位移)
            this.engine.selection.setSelection({
                ...selection,
                x: this.initialSelectionPos.x + stepX,
                y: this.initialSelectionPos.y + stepY
            });
            return true;
        }

        return false;
    }

    onMouseUp(): boolean {
        this.resetState();
        // 恢复光标
        this.engine.canvas.style.cursor = 'crosshair';
        return true;
    }

    onRender(ctx: CanvasRenderingContext2D) {
        // 选区本身的渲染交给了 SelectionLayer，工具层这里不需要画什么
        // 除非你想画拖拽时的辅助线
    }

    // --- 辅助方法 ---

    private calcRect(start: Vec2, end: Vec2) {
        const size = this.getGridSize();
        // 强制对齐网格
        const sx = MathUtils.snap(start.x, size);
        const sy = MathUtils.snap(start.y, size);
        const ex = MathUtils.snap(end.x, size);
        const ey = MathUtils.snap(end.y, size);
        
        return {
            x: Math.min(sx, ex),
            y: Math.min(sy, ey),
            w: Math.abs(ex - sx) + size, // 包含终点所在的那个格子
            h: Math.abs(ey - sy) + size
        };
    }
}