import { BaseTool } from '../core/ToolBase';
import { Vec2 } from '../types';
import { AddBlockCommand, RemoveBlockCommand, BatchCommand } from '../commands';
import { MathUtils } from '../utils/MathUtils';
import { BlockFactory } from '../utils/BlockFactory';

const isSameGrid = (p1: Vec2, p2: Vec2, size: number) => {
    return MathUtils.snap(p1.x, size) === MathUtils.snap(p2.x, size) &&
           MathUtils.snap(p1.y, size) === MathUtils.snap(p2.y, size);
};

// ==========================================
// 1. 画笔工具
// ==========================================
export class BrushTool extends BaseTool {
    name = 'brush';
    private isDrawing = false;
    private batchCommands: any[] = []; // 使用 ICommand[] 需导入接口，这里暂用 any[] 简化或补全 imports
    private lastGridPos: Vec2 | null = null;

    onActivate() {
        // [Interaction] 游标样式现在由 InputSystem 或 Plugin 管理，
        // 但工具自己设置一次也是个双保险
        this.engine.canvas.style.cursor = 'crosshair';
    }

    onDeactivate() {
        this.isDrawing = false;
        this.batchCommands = [];
        this.lastGridPos = null;
    }

    onMouseDown(pos: Vec2): boolean {
        this.isDrawing = true;
        this.batchCommands = []; 
        this.lastGridPos = null;
        this.paint(pos);
        return true; 
    }

    onMouseMove(pos: Vec2): boolean {
        if (!this.isDrawing) return false;
        if (!this.engine.state.isContinuous) return true;
        this.paint(pos);
        return true;
    }

    onMouseUp(): boolean {
        if (this.isDrawing) {
            if (this.batchCommands.length > 0) {
                const batch = new BatchCommand(this.batchCommands);
                // [History] 提交完整的批量操作
                this.engine.events.emit('history:push', batch, true);
            }
        }
        this.isDrawing = false;
        this.batchCommands = [];
        return false;
    }

    // 这里的 ctx 已经是 transform 过的，可以直接画
    onRender(ctx: CanvasRenderingContext2D) {
        // 获取鼠标的世界坐标
        const mouse = this.engine.input.mouseWorld;
        const size = this.getGridSize();
        const gx = MathUtils.snap(mouse.x, size);
        const gy = MathUtils.snap(mouse.y, size);
        const state = this.engine.state;

        // 绘制预览框 (Ghost)
        if (state.fillMode === 'image' && state.activeImage) {
            ctx.strokeStyle = '#22c55e';
            ctx.lineWidth = 2 / this.engine.camera.zoom;
            ctx.strokeRect(gx, gy, size, size);
        } else {
            ctx.fillStyle = state.activeColor + '4D'; // 30% 透明度
            ctx.fillRect(gx, gy, size, size);
            ctx.strokeStyle = 'rgba(255,255,255,0.5)';
            ctx.lineWidth = 1 / this.engine.camera.zoom;
            ctx.strokeRect(gx, gy, size, size);
        }
    }

    private paint(pos: Vec2) {
        const size = this.getGridSize();
        // 简单的防抖动
        if (this.lastGridPos && isSameGrid(pos, this.lastGridPos, size)) return;
        
        const gx = MathUtils.snap(pos.x, size);
        const gy = MathUtils.snap(pos.y, size);
        this.lastGridPos = { x: gx, y: gy };

        const block = BlockFactory.createBlock(
            this.engine.state,
            gx, gy, size
        );
        
        const cmd = new AddBlockCommand(this.engine.world, block);
        cmd.execute();
        this.batchCommands.push(cmd);
    }
}

// ==========================================
// 2. 橡皮擦工具
// ==========================================
export class EraserTool extends BaseTool {
    name = 'eraser';
    private isErasing = false;
    private batchCommands: any[] = [];
    private lastGridPos: Vec2 | null = null;

    onActivate() { this.engine.canvas.style.cursor = 'cell'; }
    onDeactivate() { this.isErasing = false; this.batchCommands = []; }

    onMouseDown(pos: Vec2): boolean {
        this.isErasing = true;
        this.batchCommands = [];
        this.lastGridPos = null;
        this.erase(pos);
        return true;
    }

    onMouseMove(pos: Vec2): boolean {
        if (!this.isErasing) return false;
        if (!this.engine.state.isContinuous) return true;
        this.erase(pos);
        return true;
    }

    onMouseUp(): boolean {
        if (this.isErasing && this.batchCommands.length > 0) {
            const batch = new BatchCommand(this.batchCommands);
            this.engine.events.emit('history:push', batch, true);
        }
        this.isErasing = false;
        this.batchCommands = [];
        return false;
    }

    onRender(ctx: CanvasRenderingContext2D) {
        const mouse = this.engine.input.mouseWorld;
        const size = this.getGridSize();
        const gx = MathUtils.snap(mouse.x, size);
        const gy = MathUtils.snap(mouse.y, size);

        // 红色警告框
        ctx.fillStyle = 'rgba(239, 68, 68, 0.2)'; // Red-500
        ctx.fillRect(gx, gy, size, size);
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 1 / this.engine.camera.zoom;
        ctx.strokeRect(gx, gy, size, size);
    }

    private erase(pos: Vec2) {
        const size = this.getGridSize();
        if (this.lastGridPos && isSameGrid(pos, this.lastGridPos, size)) return;

        const gx = MathUtils.snap(pos.x, size);
        const gy = MathUtils.snap(pos.y, size);
        this.lastGridPos = { x: gx, y: gy };

        // 使用 RemoveBlockCommand，它会查找并删除
        // 这里的坐标稍微偏移一点点以确保选中中心 (gx + 1)
        const cmd = new RemoveBlockCommand(this.engine.world, gx + 1, gy + 1);
        cmd.execute();
        this.batchCommands.push(cmd);
    }
}

// ==========================================
// 3. 矩形工具 (保持原样，逻辑依然适用)
// ==========================================
export class RectangleTool extends BaseTool {
    name = 'rectangle';
    private dragStart: Vec2 | null = null;

    onActivate() { this.engine.canvas.style.cursor = 'crosshair'; }
    onDeactivate() { this.dragStart = null; }
    
    onMouseDown(pos: Vec2): boolean {
        this.dragStart = { ...pos };
        return true;
    }

    onMouseMove(pos: Vec2): boolean { return this.dragStart !== null; }

    onMouseUp(pos: Vec2): boolean {
        if (this.dragStart) {
            const rect = this.calcRect(this.dragStart, pos);
            if (rect.w > 0 && rect.h > 0) {
                const block = BlockFactory.createRectBlock(
                    this.engine.state,
                    rect
                );
                // 矩形是一个单独的 AddBlockCommand
                const cmd = new AddBlockCommand(this.engine.world, block);
                this.engine.events.emit('history:push', cmd);
            }
            this.dragStart = null;
            return true;
        }
        return false;
    }

    onRender(ctx: CanvasRenderingContext2D) {
        // 只有拖拽时才画预览框
        if (this.dragStart && this.engine.input.isDragging) {
            const mouse = this.engine.input.mouseWorld;
            const rect = this.calcRect(this.dragStart, mouse);
            const state = this.engine.state;

            // 虚线边框
            ctx.setLineDash([4 / this.engine.camera.zoom, 4 / this.engine.camera.zoom]);
            
            if (state.fillMode === 'image') {
                ctx.strokeStyle = '#22c55e';
                ctx.lineWidth = 2 / this.engine.camera.zoom;
                ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
            } else {
                ctx.fillStyle = state.activeColor;
                ctx.globalAlpha = 0.5;
                ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
                ctx.globalAlpha = 1.0;
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 2 / this.engine.camera.zoom;
                ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
            }
            
            ctx.setLineDash([]); // Reset
        }
    }

    private calcRect(start: Vec2, end: Vec2) {
        const size = this.getGridSize();
        const sx = MathUtils.snap(start.x, size);
        const sy = MathUtils.snap(start.y, size);
        const ex = MathUtils.snap(end.x, size);
        const ey = MathUtils.snap(end.y, size);
        return {
            x: Math.min(sx, ex),
            y: Math.min(sy, ey),
            w: Math.abs(ex - sx) + size,
            h: Math.abs(ey - sy) + size
        };
    }
}

// PortalTool 逻辑类似，略过不表，以上修改已足够保证核心一致性
// ...
export class PortalTool extends BaseTool {
    name = 'portal';
    onActivate() { this.engine.canvas.style.cursor = 'alias'; }
    onDeactivate() {}
    onMouseDown(pos: Vec2): boolean {
        const size = this.getGridSize();
        const gx = MathUtils.snap(pos.x, size);
        const gy = MathUtils.snap(pos.y, size);
        const newWorldId = MathUtils.generateId('world');

        const cmd = new AddBlockCommand(this.engine.world, {
            id: MathUtils.generateId('portal'),
            x: gx, y: gy, w: size * 2, h: size * 2,
            color: '#a855f7',
            type: 'nested',
            targetWorldId: newWorldId,
            worldName: `Room ${newWorldId.slice(-4)}`
        });
        
        this.engine.events.emit('history:push', cmd);
        this.engine.events.emit('tool:set', 'hand');
        return true;
    }
    onMouseMove(): boolean { return false; }
    onMouseUp(): boolean { return false; }
    onRender(ctx: CanvasRenderingContext2D) {
        const mouse = this.engine.input.mouseWorld;
        const size = this.getGridSize();
        const gx = MathUtils.snap(mouse.x, size);
        const gy = MathUtils.snap(mouse.y, size);
        ctx.fillStyle = 'rgba(168, 85, 247, 0.5)';
        ctx.fillRect(gx, gy, size * 2, size * 2);
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1 / this.engine.camera.zoom;
        ctx.strokeRect(gx, gy, size * 2, size * 2);
    }
}