import { BaseTool } from '../core/ToolBase';
import { Vec2, ICommand } from '../types';
import { AddBlockCommand, RemoveBlockCommand, BatchCommand } from '../commands';
import { MathUtils } from '../utils/MathUtils';
import { BlockFactory } from '../utils/BlockFactory';

// --- Helper ---
const isSameGrid = (p1: Vec2, p2: Vec2, size: number) => {
    return MathUtils.snap(p1.x, size) === MathUtils.snap(p2.x, size) &&
           MathUtils.snap(p1.y, size) === MathUtils.snap(p2.y, size);
};

// ==========================================
// 1. 画笔工具 (Brush Tool) - 防重叠
// ==========================================
export class BrushTool extends BaseTool {
    name = 'brush';
    private isDrawing = false;
    private batchCommands: ICommand[] = [];
    private lastGridPos: Vec2 | null = null;

    onActivate() { this.engine.canvas.style.cursor = 'crosshair'; }
    
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
        if (this.isDrawing && this.batchCommands.length > 0) {
            const batch = new BatchCommand(this.batchCommands);
            this.engine.events.emit('history:push', batch, true);
        }
        this.isDrawing = false;
        this.batchCommands = [];
        return false;
    }

    onRender(ctx: CanvasRenderingContext2D) {
        const mouse = this.engine.input.mouseWorld;
        const size = this.getGridSize();
        const gx = MathUtils.snap(mouse.x, size);
        const gy = MathUtils.snap(mouse.y, size);
        const state = this.engine.state;

        // [Visual Feedback] 如果当前点已被占用，显示红色边框提示
        const isBlocked = this.engine.world.isPointOccupied(gx + size/2, gy + size/2);

        if (isBlocked) {
            ctx.strokeStyle = '#ef4444'; // Red
            ctx.lineWidth = 2 / this.engine.camera.zoom;
            ctx.strokeRect(gx, gy, size, size);
            // 占用时依然显示一点填充，但用红色警示
            ctx.fillStyle = 'rgba(239, 68, 68, 0.2)';
            ctx.fillRect(gx, gy, size, size);
        } else {
            // 正常预览
            if (state.fillMode === 'image' && state.activeImage) {
                ctx.strokeStyle = '#22c55e';
                ctx.lineWidth = 2 / this.engine.camera.zoom;
                ctx.strokeRect(gx, gy, size, size);
            } else {
                ctx.fillStyle = state.activeColor + '4D'; // Transparent
                ctx.fillRect(gx, gy, size, size);
                ctx.strokeStyle = 'rgba(255,255,255,0.5)';
                ctx.lineWidth = 1 / this.engine.camera.zoom;
                ctx.strokeRect(gx, gy, size, size);
            }
        }
    }

    private paint(pos: Vec2) {
        const size = this.getGridSize();
        if (this.lastGridPos && isSameGrid(pos, this.lastGridPos, size)) return;
        
        const gx = MathUtils.snap(pos.x, size);
        const gy = MathUtils.snap(pos.y, size);
        this.lastGridPos = { x: gx, y: gy };

        // [Anti-Overlap] 严格检测：只在空白处绘制
        // 使用中心点检测，避免边缘浮点误差
        if (this.engine.world.isPointOccupied(gx + size/2, gy + size/2)) {
            return; // 遇到障碍物，跳过
        }

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
// 2. 橡皮擦工具 (Eraser Tool) - 保持破坏性
// ==========================================
export class EraserTool extends BaseTool {
    name = 'eraser';
    private isErasing = false;
    private batchCommands: ICommand[] = [];
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

        ctx.fillStyle = 'rgba(239, 68, 68, 0.2)'; // Red tint
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

        // 橡皮擦不需要防重叠，它的目的就是移除
        // 使用 gx+1, gy+1 稍微偏移以确保命中方块内部
        const cmd = new RemoveBlockCommand(this.engine.world, gx + 1, gy + 1);
        cmd.execute();
        this.batchCommands.push(cmd);
    }
}

// ==========================================
// 3. 矩形工具 (Rectangle Tool) - 防重叠
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
                
                // [Anti-Overlap] 矩形区域严格检测
                if (this.engine.world.isRegionOccupied(rect.x, rect.y, rect.w, rect.h)) {
                    console.warn("[Rectangle] Creation blocked by existing blocks.");
                    // Optional: Trigger UI toast here
                } else {
                    // 区域为空，允许创建
                    const block = BlockFactory.createRectBlock(
                        this.engine.state,
                        rect
                    );
                    const cmd = new AddBlockCommand(this.engine.world, block);
                    this.engine.events.emit('history:push', cmd);
                }
            }
            this.dragStart = null;
            return true;
        }
        return false;
    }

    onRender(ctx: CanvasRenderingContext2D) {
        if (this.dragStart && this.engine.input.isDragging) {
            const mouse = this.engine.input.mouseWorld;
            const rect = this.calcRect(this.dragStart, mouse);
            const state = this.engine.state;

            // [Visual Feedback] 实时冲突检测
            const isBlocked = this.engine.world.isRegionOccupied(rect.x, rect.y, rect.w, rect.h);

            if (isBlocked) {
                ctx.fillStyle = 'rgba(239, 68, 68, 0.2)'; // Red Warning
                ctx.strokeStyle = '#ef4444';
            } else if (state.fillMode === 'image') {
                ctx.strokeStyle = '#22c55e'; // Green for image
                ctx.fillStyle = 'rgba(34, 197, 94, 0.2)';
            } else {
                ctx.fillStyle = state.activeColor;
                ctx.strokeStyle = '#fff';
            }

            // 如果被阻挡，强制半透明
            if (!isBlocked && state.fillMode !== 'image') {
                ctx.globalAlpha = 0.5;
            } else if (isBlocked) {
                ctx.globalAlpha = 0.8;
            }

            ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
            ctx.globalAlpha = 1.0;
            
            ctx.lineWidth = 2 / this.engine.camera.zoom;
            ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
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

// ==========================================
// 4. 传送门工具 (Portal Tool) - 防重叠
// ==========================================
export class PortalTool extends BaseTool {
    name = 'portal';

    onActivate() { this.engine.canvas.style.cursor = 'alias'; }
    onDeactivate() {}

    onMouseDown(pos: Vec2): boolean {
        const size = this.getGridSize();
        const gx = MathUtils.snap(pos.x, size);
        const gy = MathUtils.snap(pos.y, size);
        
        // Portal 固定为 2x2 网格大小
        const w = size * 2;
        const h = size * 2;

        // [Anti-Overlap] 检测
        if (this.engine.world.isRegionOccupied(gx, gy, w, h)) {
            console.warn("Portal blocked.");
            return true;
        }

        const newWorldId = MathUtils.generateId('world');
        const cmd = new AddBlockCommand(this.engine.world, {
            id: MathUtils.generateId('portal'),
            x: gx, y: gy, w: w, h: h,
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
        const w = size * 2;
        const h = size * 2;
        
        // [Visual Feedback] 冲突检测
        const isBlocked = this.engine.world.isRegionOccupied(gx, gy, w, h);

        if (isBlocked) {
            ctx.fillStyle = 'rgba(239, 68, 68, 0.3)'; // Red
            ctx.strokeStyle = '#ef4444';
        } else {
            ctx.fillStyle = 'rgba(168, 85, 247, 0.5)'; // Purple
            ctx.strokeStyle = '#fff';
        }

        ctx.fillRect(gx, gy, w, h);
        ctx.lineWidth = 1 / this.engine.camera.zoom;
        ctx.strokeRect(gx, gy, w, h);
    }
}