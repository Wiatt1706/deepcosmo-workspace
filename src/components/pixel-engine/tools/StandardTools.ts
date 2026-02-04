// src/engine/tools/StandardTools.ts

import { BaseTool } from '../core/ToolBase';
import { Vec2, PixelBlock } from '../types';
import { MathUtils } from '../utils/MathUtils';
import { OpType } from '../history/types';

// 辅助函数：判断两个点是否在同一个网格内 (用于连续绘制时的去重)
const isSameGrid = (p1: Vec2, p2: Vec2, size: number) => {
    return MathUtils.snap(p1.x, size) === MathUtils.snap(p2.x, size) &&
           MathUtils.snap(p1.y, size) === MathUtils.snap(p2.y, size);
};

// ==========================================
// 1. 画笔工具 (Brush Tool)
// 特性：支持连续绘制、事务打包、Alt吸色
// ==========================================
export class BrushTool extends BaseTool {
    name = 'brush';
    private isDrawing = false;
    private lastGridPos: Vec2 | null = null;

    onActivate() { 
        this.engine.canvas.style.cursor = 'crosshair'; 
    }
    
    onDeactivate() {
        if (this.isDrawing) {
            // 安全保护：如果异常切出工具，强制提交当前事务
            this.engine.history.commitTransaction();
            this.isDrawing = false;
        }
        this.lastGridPos = null;
    }

    onMouseDown(pos: Vec2, e: MouseEvent): boolean {
        // [Feature] Alt + Click = 吸色
        if (e.altKey) {
            const block = this.engine.world.getBlockAt(pos.x, pos.y);
            if (block) {
                this.engine.events.emit('style:set-color', block.color);
            }
            return true;
        }

        this.isDrawing = true;
        this.lastGridPos = null;

        // [Transaction] 1. 开启事务 (开始一笔)
        this.engine.history.beginTransaction("Brush Stroke");

        this.paint(pos);
        return true; 
    }

    onMouseMove(pos: Vec2): boolean {
        if (!this.isDrawing) return false;
        // 支持配置：是否允许连续绘制
        if (this.engine.state.isContinuous) {
            this.paint(pos);
        }
        return true;
    }

    onMouseUp(): boolean {
        if (this.isDrawing) {
            this.isDrawing = false;
            // [Transaction] 2. 提交事务 (结束一笔)
            this.engine.history.commitTransaction();
        }
        this.lastGridPos = null;
        return false;
    }

    private paint(pos: Vec2) {
        const size = this.getGridSize();
        
        // 性能优化：如果在同一个格子里移动，不执行逻辑
        if (this.lastGridPos && isSameGrid(pos, this.lastGridPos, size)) return;

        const { x: gx, y: gy } = this.getSnappedPos(pos);
        this.lastGridPos = { x: gx, y: gy };

        // 逻辑检测：只有空格子才能画
        if (this.engine.world.isPointOccupied(gx + size/2, gy + size/2)) return;

        // 构造 Block 数据
        const newBlock: PixelBlock = {
            id: MathUtils.generateId(), // 生成稳定 UUID
            x: gx, 
            y: gy, 
            w: size, 
            h: size,
            color: this.engine.state.activeColor,
            type: 'basic',
            createdAt: Math.floor(Date.now() / 1000)
        };

        // 处理贴图模式
        if (this.engine.state.fillMode === 'image' && this.engine.state.activeImage) {
            newBlock.type = 'image';
            newBlock.imageUrl = this.engine.state.activeImage.url;
        }

        // [Core] 1. 执行添加
        this.engine.world.addBlock(newBlock);

        // [Core] 2. 记录原子操作
        this.engine.history.record({
            type: OpType.ADD,
            block: newBlock
        });

        this.engine.requestRender();
    }

    onRender(ctx: CanvasRenderingContext2D) {
        const mouse = this.engine.input.mouseWorld;
        const size = this.getGridSize();
        const { x: gx, y: gy } = this.getSnappedPos(mouse);
        const state = this.engine.state;

        // 1. 选区遮罩检测 (如果有选区，只能画在选区内)
        // 这里为了解耦，暂时简单判断，实际项目中可结合 SelectionSystem
        // ...

        // 2. 绘制预览光标
        const isBlocked = this.engine.world.isPointOccupied(gx + size/2, gy + size/2);

        if (isBlocked) {
            // 红色表示被阻挡
            ctx.fillStyle = 'rgba(239, 68, 68, 0.2)'; 
            ctx.strokeStyle = '#ef4444';
        } else {
            // 绿色/当前色表示可绘制
            if (state.fillMode === 'image' && state.activeImage) {
                ctx.strokeStyle = '#22c55e';
                ctx.fillStyle = 'rgba(34, 197, 94, 0.1)';
            } else {
                ctx.fillStyle = state.activeColor + '4D'; // 30% alpha
                ctx.strokeStyle = 'rgba(255,255,255,0.8)';
            }
        }

        ctx.lineWidth = 1 / this.engine.camera.zoom;
        ctx.fillRect(gx, gy, size, size);
        ctx.strokeRect(gx, gy, size, size);
    }
}

// ==========================================
// 2. 橡皮擦工具 (Eraser Tool)
// 特性：连续擦除、快照备份
// ==========================================
export class EraserTool extends BaseTool {
    name = 'eraser';
    private isErasing = false;
    private lastGridPos: Vec2 | null = null;

    onActivate() { 
        this.engine.canvas.style.cursor = 'cell'; 
    }
    
    onDeactivate() { 
        if (this.isErasing) {
            this.engine.history.commitTransaction();
            this.isErasing = false;
        }
        this.lastGridPos = null;
    }

    onMouseDown(pos: Vec2): boolean {
        this.isErasing = true;
        this.lastGridPos = null;
        
        // [Transaction] Start
        this.engine.history.beginTransaction("Erase");
        
        this.erase(pos);
        return true;
    }

    onMouseMove(pos: Vec2): boolean {
        if (!this.isErasing) return false;
        if (this.engine.state.isContinuous) {
            this.erase(pos);
        }
        return true;
    }

    onMouseUp(): boolean {
        if (this.isErasing) {
            this.isErasing = false;
            // [Transaction] Commit
            this.engine.history.commitTransaction();
        }
        return false;
    }

    private erase(pos: Vec2) {
        const size = this.getGridSize();
        
        if (this.lastGridPos && isSameGrid(pos, this.lastGridPos, size)) return;

        const { x: gx, y: gy } = this.getSnappedPos(pos);
        this.lastGridPos = { x: gx, y: gy };

        // 查找目标方块
        const targetBlock = this.engine.world.getBlockAt(gx + size/2, gy + size/2);
        
        if (targetBlock) {
            // [Core] 1. 创建数据快照 (必须深拷贝，因为内存中的对象即将被移除)
            const snapshot = { ...targetBlock }; 

            // [Core] 2. 执行删除
            this.engine.world.removeBlockById(targetBlock.id);

            // [Core] 3. 记录操作
            this.engine.history.record({
                type: OpType.REMOVE,
                id: targetBlock.id,
                prevBlock: snapshot // Undo 时通过此快照恢复
            });
            
            this.engine.requestRender();
        }
    }

    onRender(ctx: CanvasRenderingContext2D) {
        const mouse = this.engine.input.mouseWorld;
        const size = this.getGridSize();
        const { x: gx, y: gy } = this.getSnappedPos(mouse);

        // 橡皮擦总是显示红色高亮
        ctx.fillStyle = 'rgba(239, 68, 68, 0.2)'; 
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 1 / this.engine.camera.zoom;
        
        ctx.fillRect(gx, gy, size, size);
        ctx.strokeRect(gx, gy, size, size);
    }
}

// ==========================================
// 3. 矩形工具 (Rectangle Tool)
// 特性：拖拽预览、单次事务生成
// ==========================================
export class RectangleTool extends BaseTool {
    name = 'rectangle';
    protected dragStart: Vec2 | null = null;

    onActivate() { 
        this.engine.canvas.style.cursor = 'crosshair'; 
    }

    onDeactivate() { 
        this.dragStart = null; 
    }
    
    onMouseDown(pos: Vec2): boolean {
        // 记录起始点，不开启事务，因为还没确定是否生成
        this.dragStart = this.getSnappedPos(pos);
        return true;
    }

    onMouseMove(pos: Vec2): boolean { 
        // 仅触发渲染预览，不修改数据
        if (this.dragStart) {
            this.engine.requestRender();
            return true;
        }
        return false; 
    }

    onMouseUp(pos: Vec2): boolean {
        if (this.dragStart) {
            const rect = this.calcRect(this.dragStart, pos);
            // 只有宽高有效才创建
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
        // 1. 碰撞检测：如果区域内已被占用，则不创建 (或者你可以改为“覆盖模式”)
        if (this.engine.world.isRegionOccupied(rect.x, rect.y, rect.w, rect.h)) {
            console.warn("[Rectangle] Region occupied.");
            return;
        }

        // [Transaction] 开启事务 - 这是一个原子操作
        this.engine.history.beginTransaction("Create Rectangle");

        const block: PixelBlock = {
            id: MathUtils.generateId(),
            x: rect.x,
            y: rect.y,
            w: rect.w,
            h: rect.h,
            color: this.engine.state.activeColor,
            type: 'basic',
            createdAt: Math.floor(Date.now() / 1000)
        };

        if (this.engine.state.fillMode === 'image' && this.engine.state.activeImage) {
            block.type = 'image';
            block.imageUrl = this.engine.state.activeImage.url;
        }

        // 执行 & 记录
        this.engine.world.addBlock(block);
        this.engine.history.record({
            type: OpType.ADD,
            block: block
        });

        // [Transaction] 立即提交
        this.engine.history.commitTransaction();
    }

    onRender(ctx: CanvasRenderingContext2D) {
        if (this.dragStart && this.engine.input.isDragging) {
            // 拖拽中：绘制预览矩形
            const mouse = this.engine.input.mouseWorld;
            const rect = this.calcRect(this.dragStart, mouse);
            this.renderPreview(ctx, rect);
        } else {
            // 闲置中：绘制单格光标
            const mouse = this.engine.input.mouseWorld;
            const size = this.getGridSize();
            const { x, y } = this.getSnappedPos(mouse);
            
            ctx.strokeStyle = 'rgba(255,255,255,0.5)';
            ctx.lineWidth = 1 / this.engine.camera.zoom;
            ctx.strokeRect(x, y, size, size);
        }
    }

    protected renderPreview(ctx: CanvasRenderingContext2D, rect: any) {
         // 检测预览区域是否被占用，显示不同颜色
         const isBlocked = this.engine.world.isRegionOccupied(rect.x, rect.y, rect.w, rect.h);

         if (isBlocked) {
            ctx.fillStyle = 'rgba(239, 68, 68, 0.2)';
            ctx.strokeStyle = '#ef4444';
         } else {
            const style = this.getPreviewStyle();
            ctx.fillStyle = style.fill;
            ctx.strokeStyle = style.stroke;
         }

         ctx.lineWidth = 2 / this.engine.camera.zoom;
         ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
         ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
    }

    protected getPreviewStyle() {
        const state = this.engine.state;
        if (state.fillMode === 'image') {
            return { fill: 'rgba(34, 197, 94, 0.2)', stroke: '#22c55e' };
        }
        return { fill: state.activeColor, stroke: '#fff' };
    }

    // 计算标准化的矩形 (处理负方向拖拽)
    protected calcRect(start: Vec2, currentWorld: Vec2) {
        const size = this.getGridSize();
        const end = this.getSnappedPos(currentWorld);
        const sx = start.x; const sy = start.y;
        const ex = end.x; const ey = end.y;

        return {
            x: Math.min(sx, ex),
            y: Math.min(sy, ey),
            w: Math.abs(ex - sx) + size, // 包含终点格子
            h: Math.abs(ey - sy) + size
        };
    }
}

// ==========================================
// 4. 传送门工具 (Portal Tool)
// 特性：继承矩形工具，生成 Nested Block
// ==========================================
export class PortalTool extends RectangleTool {
    name = 'portal';

    onActivate() { 
        this.engine.canvas.style.cursor = 'alias'; 
    }

    protected createBlockInRect(rect: {x:number, y:number, w:number, h:number}) {
        // 传送门不允许重叠
        if (this.engine.world.isRegionOccupied(rect.x, rect.y, rect.w, rect.h)) {
            return;
        }

        // [Transaction] Start
        this.engine.history.beginTransaction("Create Portal");

        const newWorldId = MathUtils.generateId('world');
        const block: PixelBlock = {
            id: MathUtils.generateId('portal'),
            x: rect.x, 
            y: rect.y, 
            w: rect.w, 
            h: rect.h,
            color: '#a855f7', // 传送门固定紫色
            type: 'nested',
            targetWorldId: newWorldId,
            worldName: `Room ${newWorldId.slice(-4)}`,
            createdAt: Math.floor(Date.now() / 1000)
        };

        // 执行 & 记录
        this.engine.world.addBlock(block);
        this.engine.history.record({
            type: OpType.ADD,
            block: block
        });

        // [Transaction] Commit
        this.engine.history.commitTransaction();

        // 创建完传送门后，自动切回抓手工具 (UX 优化)
        this.engine.events.emit('tool:set', 'hand');
    }

    protected getPreviewStyle() {
        return { fill: 'rgba(168, 85, 247, 0.5)', stroke: '#fff' };
    }
}