// src/engine/tools/StandardTools.ts
import { BaseTool } from '../core/ToolBase';
import { Vec2, ICommand } from '../types'; // [Fixed] 引入 ICommand
import { AddBlockCommand, RemoveBlockCommand, BatchCommand } from '../commands';
import { MathUtils } from '../utils/MathUtils';
import { BlockFactory } from '../utils/BlockFactory';

// --- Helper ---
const isSameGrid = (p1: Vec2, p2: Vec2, size: number) => {
    return MathUtils.snap(p1.x, size) === MathUtils.snap(p2.x, size) &&
           MathUtils.snap(p1.y, size) === MathUtils.snap(p2.y, size);
};

// ==========================================
// 1. 画笔工具 (Brush Tool)
// ==========================================
export class BrushTool extends BaseTool {
    name = 'brush';
    private isDrawing = false;
    // [Fixed] 严格类型定义，不再使用 any
    private batchCommands: ICommand[] = []; 
    private lastGridPos: Vec2 | null = null;

    onActivate() { this.engine.canvas.style.cursor = 'crosshair'; }
    
    onDeactivate() {
        if (this.isDrawing) this.commitBatch();
        this.reset();
    }

    private reset() {
        this.isDrawing = false;
        this.batchCommands = [];
        this.lastGridPos = null;
    }

    onMouseDown(pos: Vec2, e: MouseEvent): boolean {
        if (e.altKey) {
            const block = this.engine.world.getBlockAt(pos.x, pos.y);
            if (block && block.color) {
                this.engine.events.emit('style:set-color', block.color);
            }
            return true;
        }

        this.isDrawing = true;
        this.batchCommands = []; 
        this.lastGridPos = null;
        this.paint(pos);
        return true; 
    }

    onMouseMove(pos: Vec2): boolean {
        if (!this.isDrawing) return false;
        if (this.engine.state.isContinuous) this.paint(pos);
        return true;
    }

    onMouseUp(): boolean {
        this.commitBatch();
        this.reset();
        return false;
    }

    private commitBatch() {
        if (this.batchCommands.length > 0) {
            const batch = new BatchCommand(this.batchCommands);
            this.engine.events.emit('history:push', batch, true);
        }
        this.batchCommands = [];
    }

    onRender(ctx: CanvasRenderingContext2D) {
        const mouse = this.engine.input.mouseWorld;
        const size = this.getGridSize();
        const { x: gx, y: gy } = this.getSnappedPos(mouse);
        const state = this.engine.state;

        const isBlocked = this.engine.world.isPointOccupied(gx + size/2, gy + size/2);
        const isOutsideSelection = !this.isPointInSelection(gx, gy);

        if (isOutsideSelection) {
            ctx.strokeStyle = '#9ca3af';
            ctx.lineWidth = 1 / this.engine.camera.zoom;
            ctx.beginPath();
            ctx.moveTo(gx, gy); ctx.lineTo(gx + size, gy + size);
            ctx.moveTo(gx + size, gy); ctx.lineTo(gx, gy + size);
            ctx.stroke();
            return;
        }

        if (isBlocked) {
            ctx.fillStyle = 'rgba(239, 68, 68, 0.2)'; 
            ctx.strokeStyle = '#ef4444';
        } else {
            if (state.fillMode === 'image' && state.activeImage) {
                ctx.strokeStyle = '#22c55e';
                ctx.fillStyle = 'rgba(34, 197, 94, 0.1)';
            } else {
                ctx.fillStyle = state.activeColor + '4D'; 
                ctx.strokeStyle = 'rgba(255,255,255,0.8)';
            }
        }

        ctx.fillRect(gx, gy, size, size);
        ctx.lineWidth = 1 / this.engine.camera.zoom;
        ctx.strokeRect(gx, gy, size, size);
    }

    private paint(pos: Vec2) {
        const size = this.getGridSize();
        if (this.lastGridPos && isSameGrid(pos, this.lastGridPos, size)) return;
        
        const { x: gx, y: gy } = this.getSnappedPos(pos);
        this.lastGridPos = { x: gx, y: gy };

        if (!this.isPointInSelection(gx, gy)) return;
        if (this.engine.world.isPointOccupied(gx + size/2, gy + size/2)) return;

        const block = BlockFactory.createBlock(
            this.engine.state,
            gx, gy, size
        );
        
        const cmd = new AddBlockCommand(this.engine.world, block);
        cmd.execute();
        this.batchCommands.push(cmd);
        
        this.engine.requestRender();
    }

    private isPointInSelection(x: number, y: number): boolean {
        const sel = this.engine.selection.currentSelection;
        if (!sel) return true;
        return x >= sel.x && x < sel.x + sel.w &&
               y >= sel.y && y < sel.y + sel.h;
    }
}

// ==========================================
// 2. 橡皮擦工具 (Eraser Tool)
// ==========================================
export class EraserTool extends BaseTool {
    name = 'eraser';
    private isErasing = false;
    // [Fixed] 严格类型定义
    private batchCommands: ICommand[] = [];
    private lastGridPos: Vec2 | null = null;

    onActivate() { this.engine.canvas.style.cursor = 'cell'; }
    
    onDeactivate() { 
        if (this.isErasing) this.commitBatch();
        this.reset();
    }

    private reset() {
        this.isErasing = false;
        this.batchCommands = [];
        this.lastGridPos = null;
    }

    onMouseDown(pos: Vec2): boolean {
        this.isErasing = true;
        this.batchCommands = [];
        this.lastGridPos = null;
        this.erase(pos);
        return true;
    }

    onMouseMove(pos: Vec2): boolean {
        if (!this.isErasing) return false;
        if (this.engine.state.isContinuous) this.erase(pos);
        return true;
    }

    onMouseUp(): boolean {
        this.commitBatch();
        this.reset();
        return false;
    }

    private commitBatch() {
        if (this.batchCommands.length > 0) {
            const batch = new BatchCommand(this.batchCommands);
            this.engine.events.emit('history:push', batch, true);
        }
        this.batchCommands = [];
    }

    onRender(ctx: CanvasRenderingContext2D) {
        const mouse = this.engine.input.mouseWorld;
        const size = this.getGridSize();
        const { x: gx, y: gy } = this.getSnappedPos(mouse);

        if (!this.isPointInSelection(gx, gy)) {
             ctx.strokeStyle = '#9ca3af'; 
             ctx.lineWidth = 1 / this.engine.camera.zoom;
             ctx.beginPath();
             ctx.moveTo(gx, gy); ctx.lineTo(gx + size, gy + size);
             ctx.moveTo(gx + size, gy); ctx.lineTo(gx, gy + size);
             ctx.stroke();
             return;
        }

        ctx.fillStyle = 'rgba(239, 68, 68, 0.2)'; 
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 1 / this.engine.camera.zoom;
        
        ctx.fillRect(gx, gy, size, size);
        ctx.strokeRect(gx, gy, size, size);
    }

    private erase(pos: Vec2) {
        const size = this.getGridSize();
        if (this.lastGridPos && isSameGrid(pos, this.lastGridPos, size)) return;

        const { x: gx, y: gy } = this.getSnappedPos(pos);
        this.lastGridPos = { x: gx, y: gy };

        if (!this.isPointInSelection(gx, gy)) return;

        const cmd = new RemoveBlockCommand(this.engine.world, gx + size/2, gy + size/2);
        cmd.execute();
        this.batchCommands.push(cmd);
        this.engine.requestRender();
    }

    private isPointInSelection(x: number, y: number): boolean {
        const sel = this.engine.selection.currentSelection;
        if (!sel) return true;
        return x >= sel.x && x < sel.x + sel.w &&
               y >= sel.y && y < sel.y + sel.h;
    }
}

// ==========================================
// 3. 矩形工具 (Rectangle Tool)
// ==========================================
export class RectangleTool extends BaseTool {
    name = 'rectangle';
    protected dragStart: Vec2 | null = null;

    onActivate() { this.engine.canvas.style.cursor = 'crosshair'; }
    onDeactivate() { this.dragStart = null; }
    
    onMouseDown(pos: Vec2): boolean {
        this.dragStart = this.getSnappedPos(pos);
        return true;
    }

    onMouseMove(pos: Vec2): boolean { return this.dragStart !== null; }

    onMouseUp(pos: Vec2): boolean {
        if (this.dragStart) {
            const rect = this.calcRect(this.dragStart, pos);
            if (rect.w > 0 && rect.h > 0) {
                this.createBlockInRect(rect);
            }
            this.dragStart = null;
            this.engine.requestRender();
            return true;
        }
        return false;
    }

    protected createBlockInRect(rect: {x:number, y:number, w:number, h:number}) {
        if (this.engine.world.isRegionOccupied(rect.x, rect.y, rect.w, rect.h)) {
            console.warn("[Rectangle] Blocked.");
        } else {
            const block = BlockFactory.createRectBlock(
                this.engine.state,
                rect
            );
            const cmd = new AddBlockCommand(this.engine.world, block);
            cmd.execute();
            this.engine.events.emit('history:push', cmd, true);
        }
    }

    onRender(ctx: CanvasRenderingContext2D) {
        if (this.dragStart && this.engine.input.isDragging) {
            const mouse = this.engine.input.mouseWorld;
            const rect = this.calcRect(this.dragStart, mouse);
            this.renderPreview(ctx, rect);
        } else {
            const mouse = this.engine.input.mouseWorld;
            const size = this.getGridSize();
            const { x, y } = this.getSnappedPos(mouse);
            
            ctx.strokeStyle = 'rgba(255,255,255,0.5)';
            ctx.lineWidth = 1 / this.engine.camera.zoom;
            ctx.strokeRect(x, y, size, size);
        }
    }

    protected renderPreview(ctx: CanvasRenderingContext2D, rect: any) {
         const isBlocked = this.engine.world.isRegionOccupied(rect.x, rect.y, rect.w, rect.h);

         if (isBlocked) {
            ctx.fillStyle = 'rgba(239, 68, 68, 0.2)';
            ctx.strokeStyle = '#ef4444';
         } else {
            const style = this.getPreviewStyle();
            ctx.fillStyle = style.fill;
            ctx.strokeStyle = style.stroke;
         }

         ctx.globalAlpha = isBlocked ? 0.8 : 0.5;
         ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
         ctx.globalAlpha = 1.0;
         ctx.lineWidth = 2 / this.engine.camera.zoom;
         ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
    }

    protected getPreviewStyle() {
        const state = this.engine.state;
        if (state.fillMode === 'image') {
            return { fill: 'rgba(34, 197, 94, 0.2)', stroke: '#22c55e' };
        }
        return { fill: state.activeColor, stroke: '#fff' };
    }

    protected calcRect(start: Vec2, currentWorld: Vec2) {
        const size = this.getGridSize();
        const end = this.getSnappedPos(currentWorld);
        const sx = start.x; const sy = start.y;
        const ex = end.x; const ey = end.y;

        return {
            x: Math.min(sx, ex),
            y: Math.min(sy, ey),
            w: Math.abs(ex - sx) + size,
            h: Math.abs(ey - sy) + size
        };
    }
}

// ==========================================
// 4. 传送门工具 (Portal Tool)
// ==========================================
export class PortalTool extends RectangleTool {
    name = 'portal';

    onActivate() { this.engine.canvas.style.cursor = 'alias'; }

    protected createBlockInRect(rect: {x:number, y:number, w:number, h:number}) {
        if (this.engine.world.isRegionOccupied(rect.x, rect.y, rect.w, rect.h)) {
            return;
        }

        const newWorldId = MathUtils.generateId('world');
        const cmd = new AddBlockCommand(this.engine.world, {
            id: MathUtils.generateId('portal'),
            x: rect.x, y: rect.y, w: rect.w, h: rect.h,
            color: '#a855f7',
            type: 'nested',
            targetWorldId: newWorldId,
            worldName: `Room ${newWorldId.slice(-4)}`
        });
        
        cmd.execute();
        this.engine.events.emit('history:push', cmd, true);
        this.engine.events.emit('tool:set', 'hand');
    }

    protected getPreviewStyle() {
        return { fill: 'rgba(168, 85, 247, 0.5)', stroke: '#fff' };
    }
}