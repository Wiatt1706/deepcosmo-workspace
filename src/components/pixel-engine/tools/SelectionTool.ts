import { BaseTool } from '../core/ToolBase';
import { Vec2, SelectionRect } from '../types';
import { MathUtils } from '../utils/MathUtils';
import { OpType } from '../history/types'; // [New] 引入 OpType

enum InteractionState {
    IDLE,
    SELECTING,
    MOVING
}

export class SelectionTool extends BaseTool {
    name = 'rectangle-select';
    
    // --- State ---
    private state: InteractionState = InteractionState.IDLE;
    private startPos: Vec2 | null = null;
    private initialSelectionPos: Vec2 | null = null;
    private dragOffset: Vec2 | null = null;

    // --- Coord Cache ---
    private lastCanvasPos: Vec2 | null = null; 
    private _dragStartCanvasPos: Vec2 | null = null; // 专门用于计算点击距离

    // --- Config ---
    private readonly DRAG_THRESHOLD = 3;
    private readonly EDGE_THRESHOLD = 60; 
    private readonly MAX_SCROLL_SPEED = 12;

    private autoScrollFrameId: number | null = null;

    onActivate() { 
        this.updateCursor(); 
        window.addEventListener('keydown', this.handleKeyDown);
    }
    
    onDeactivate() {
        this.stopAutoScroll();
        // 如果切出工具时还有浮动块，强制放置并提交
        if (this.engine.selection.isLifted) {
            this.engine.selection.place();
        }
        this.engine.selection.clear();
        this.reset();
        window.removeEventListener('keydown', this.handleKeyDown);
    }

    private reset() {
        this.state = InteractionState.IDLE;
        this.startPos = null;
        this.initialSelectionPos = null;
        this.dragOffset = null;
        this.lastCanvasPos = null;
        this._dragStartCanvasPos = null;
    }

    // ==========================================
    // Keyboard Logic
    // ==========================================
    private handleKeyDown = (e: KeyboardEvent) => {
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
        const { selection } = this.engine;
        if (!selection.hasSelection) return;

        // 删除选区内容
        if (e.code === 'Delete' || e.code === 'Backspace') {
            e.preventDefault();
            this.deleteSelection();
            return;
        }

        // 取消选区 / 放弃移动
        if (e.code === 'Escape') {
            e.preventDefault();
            if (selection.isLifted) selection.abortMove(); 
            else selection.clear();
            this.reset();
            return;
        }

        // 确认移动 (放置)
        if (e.code === 'Enter') {
             e.preventDefault();
             if (selection.isLifted) selection.place();
             selection.clear();
             this.reset();
             return;
        }

        // 键盘微调 (Nudge)
        const isShift = e.shiftKey;
        const multiplier = isShift ? 5 : 1;
        const gridSize = this.getGridSize();
        const step = gridSize * multiplier;

        let dx = 0; let dy = 0;
        switch (e.code) {
            case 'ArrowUp':    dy = -step; break;
            case 'ArrowDown':  dy = step;  break;
            case 'ArrowLeft':  dx = -step; break;
            case 'ArrowRight': dx = step;  break;
            default: return;
        }
        e.preventDefault();

        const current = selection.currentSelection!;
        const newRect = { ...current, x: current.x + dx, y: current.y + dy };

        // 如果还没浮起，先浮起 (Lift)
        if (!selection.isLifted) selection.lift();
        
        // 更新选区位置 (视觉更新，尚未写入 World)
        selection.setSelection(newRect, true);
    }

    /**
     * [Refactor] 使用 Transaction 替代 BatchCommand
     */
    private deleteSelection() {
        const { selection, world, history } = this.engine;
        
        // 1. 如果当前是浮动状态 (Lifted)，先放置回 World，或者直接视为删除浮动块？
        // 逻辑：如果已经 Lifted，说明原位置已经空了。如果此时删除，相当于丢弃手上的东西。
        // 但为了统一，我们先 place() 回去，再执行删除逻辑，或者直接 abortMove() 再删除。
        // 最稳妥的方式：先 place，确保数据在 World 里，然后通过 ID 删除。
        if (selection.isLifted) {
            if (!selection.place()) return;
        }

        const ids = Array.from(selection.selectedIds);
        if (ids.length === 0) return;

        // 2. 开启事务
        history.beginTransaction("Delete Selection");

        // 3. 批量执行删除
        for (const id of ids) {
            const block = world.getBlockById(id);
            if (block) {
                // Snapshot
                const snapshot = { ...block };
                // Execute
                world.removeBlockById(id);
                // Record
                history.record({
                    type: OpType.REMOVE,
                    id: id,
                    prevBlock: snapshot
                });
            }
        }

        // 4. 提交
        history.commitTransaction();
        
        // 5. 清理选区
        selection.clear();
        this.engine.requestRender();
    }

    // ==========================================
    // Mouse Logic
    // ==========================================

    private getCanvasRelativePos(e: MouseEvent): Vec2 {
        const rect = this.engine.canvas.getBoundingClientRect();
        return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    }

    onMouseDown(pos: Vec2, e: MouseEvent): boolean {
        this.startPos = pos;
        this._dragStartCanvasPos = this.getCanvasRelativePos(e);
        this.lastCanvasPos = this._dragStartCanvasPos;

        const isHit = this.checkHit(pos);

        if (isHit) {
            // [State] MOVING: 准备拖拽
            const sel = this.engine.selection.currentSelection!; 
            this.state = InteractionState.MOVING;
            this.initialSelectionPos = { x: sel.x, y: sel.y };
            this.dragOffset = { x: pos.x - sel.x, y: pos.y - sel.y };
            this.engine.canvas.style.cursor = 'move';
        } else {
            // [State] SELECTING: 准备框选
            // 如果之前有浮动块，点击外部视为“确认放置”
            if (this.engine.selection.isLifted) {
                if (!this.engine.selection.place()) return true; // 如果放置失败（如重叠），保持状态
            }
            
            if (!e.shiftKey) this.engine.selection.clear();
            
            this.state = InteractionState.SELECTING;
            const rect = this.calcGridRect(pos, pos);
            this.engine.selection.setMarqueeRect(rect);
        }

        this.startAutoScroll();
        return true;
    }

    onMouseMove(pos: Vec2, e: MouseEvent): boolean {
        this.lastCanvasPos = this.getCanvasRelativePos(e);
        if (this.state === InteractionState.IDLE) {
            this.updateCursor(pos);
            return false;
        }
        this.handleDragLogic(pos, e);
        return true;
    }

    onMouseUp(pos: Vec2, e: MouseEvent): boolean {
        this.stopAutoScroll();

        // 区分 Click 和 Drag
        const isDragOperation = this.engine.selection.isLifted;
        const dragDist = this.getDragDistance(e);
        const isClick = !isDragOperation && (dragDist < this.DRAG_THRESHOLD);

        if (isClick) {
            // --- 点击选择 ---
            const block = this.engine.world.getBlockAt(pos.x, pos.y);
            this.engine.selection.handlePointSelection(block, e.shiftKey);
        } else {
            // --- 拖拽结束 ---
            if (this.state === InteractionState.MOVING) {
                // 如果是浮动状态，这里**不自动放置**，保持浮动状态，允许用户继续微调
                // 只有切换工具或点击空白处才真正 Place
                // 但是，如果只是普通的移动，通常鼠标松开就视为放置？
                // 仿照 Photoshop：鼠标松开不放置，保持选区虚线，方块已移动。
                // 只有当用户点击外部时，才合并图层。
                // 在我们的实现里，place() 是将浮动层写入 World。
                
                // 策略：保持 isLifted = true。
                // 这样用户可以松开鼠标，然后再次拖拽。
                // 真正写入历史记录是在 place() 被调用时 (Tool切换, Enter键, 或点击外部)。
            } else if (this.state === InteractionState.SELECTING) {
                const rect = this.calcGridRect(this.startPos!, pos);
                this.engine.selection.handleRegionSelection(rect, e.shiftKey);
            }
        }

        this.reset();
        this.updateCursor(pos);
        return true;
    }

    onRender(ctx: CanvasRenderingContext2D) {}

    // ==========================================
    // Logic & Helpers
    // ==========================================

    private handleDragLogic(pos: Vec2, e?: MouseEvent) {
        // 处理移动逻辑
        if (this.state === InteractionState.MOVING && this.initialSelectionPos && this.dragOffset) {
            // 如果还没 Lift，且拖拽距离足够，触发 Lift
            if (!this.engine.selection.isLifted) {
                const dist = e ? this.getDragDistance(e) : this.DRAG_THRESHOLD + 10;
                if (dist > this.DRAG_THRESHOLD) {
                    this.engine.selection.lift();
                } else {
                    return; // 还没达到阈值，不移动
                }
            }
            
            // 计算吸附后的新位置
            const gridSize = this.getGridSize();
            const rawTargetX = pos.x - this.dragOffset.x;
            const rawTargetY = pos.y - this.dragOffset.y;
            const snappedTargetX = MathUtils.snap(rawTargetX, gridSize);
            const snappedTargetY = MathUtils.snap(rawTargetY, gridSize);

            const current = this.engine.selection.currentSelection;
            if (current && (current.x !== snappedTargetX || current.y !== snappedTargetY)) {
                // 更新选区矩形，这会带动 Lifted Blocks 渲染在新的位置
                this.engine.selection.setSelection({
                    ...current, x: snappedTargetX, y: snappedTargetY
                }, true);
            }
        }
        
        // 处理框选逻辑
        if (this.state === InteractionState.SELECTING && this.startPos) {
            const rect = this.calcGridRect(this.startPos, pos);
            this.engine.selection.setMarqueeRect(rect);
        }
    }

    private startAutoScroll() {
        if (this.autoScrollFrameId !== null) return;
        const loop = () => {
            this.performAutoScroll();
            this.autoScrollFrameId = requestAnimationFrame(loop);
        };
        this.autoScrollFrameId = requestAnimationFrame(loop);
    }

    private stopAutoScroll() {
        if (this.autoScrollFrameId !== null) {
            cancelAnimationFrame(this.autoScrollFrameId);
            this.autoScrollFrameId = null;
        }
    }

    private performAutoScroll() {
        if (!this.lastCanvasPos || this.state === InteractionState.IDLE) return;
        const rect = this.engine.canvas.getBoundingClientRect();
        const { x, y } = this.lastCanvasPos;
        let dx = 0; let dy = 0;

        const getSpeed = (dist: number, threshold: number): number => {
            if (dist > threshold) return 0;
            const ratio = 1 - (Math.max(0, dist) / threshold);
            return Math.pow(ratio, 2) * this.MAX_SCROLL_SPEED;
        };

        if (x < this.EDGE_THRESHOLD) dx = getSpeed(x, this.EDGE_THRESHOLD); 
        else if (x > rect.width - this.EDGE_THRESHOLD) dx = -getSpeed(rect.width - x, this.EDGE_THRESHOLD);

        if (y < this.EDGE_THRESHOLD) dy = getSpeed(y, this.EDGE_THRESHOLD);
        else if (y > rect.height - this.EDGE_THRESHOLD) dy = -getSpeed(rect.height - y, this.EDGE_THRESHOLD);

        if (Math.abs(dx) < 0.2 && Math.abs(dy) < 0.2) return;

        this.engine.camera.panBy(dx, dy);
        const newWorldPos = this.engine.camera.screenToWorld(x, y);
        this.handleDragLogic(newWorldPos);
        this.engine.requestRender();
    }

    private updateCursor(pos?: Vec2) {
        if (this.state !== InteractionState.IDLE) return;
        const p = pos || this.engine.input.mouseWorld;
        if (this.checkHit(p)) this.engine.canvas.style.cursor = 'move';
        else this.engine.canvas.style.cursor = 'crosshair';
    }

    private checkHit(pos: Vec2): boolean {
        const selection = this.engine.selection.currentSelection;
        if (!selection) return false;
        if (!this.isPointInRect(pos, selection)) return false;

        // 仅当鼠标悬停在选中的方块上时才显示 Move 光标，空白区域不显示
        if (this.engine.selection.isLifted) {
            const liftedBlocks = this.engine.selection.liftedBlocks;
            const relX = pos.x - selection.x;
            const relY = pos.y - selection.y;
            return liftedBlocks.some(b => 
                relX >= b.x && relX < b.x + b.w && relY >= b.y && relY < b.y + b.h
            );
        } else {
            const block = this.engine.world.getBlockAt(pos.x, pos.y);
            if (!block) return false;
            return this.engine.selection.selectedIds.has(block.id);
        }
    }

    private isPointInRect(p: Vec2, r: SelectionRect) {
        return p.x >= r.x && p.x < r.x + r.w && p.y >= r.y && p.y < r.y + r.h;
    }

    private getDragDistance(e: MouseEvent) {
        if (!this._dragStartCanvasPos) return 999;
        const current = this.getCanvasRelativePos(e);
        return Math.abs(current.x - this._dragStartCanvasPos.x) + Math.abs(current.y - this._dragStartCanvasPos.y);
    }

    private calcGridRect(start: Vec2, end: Vec2): SelectionRect {
        const size = this.getGridSize();
        const sx = Math.floor(start.x / size) * size;
        const sy = Math.floor(start.y / size) * size;
        const ex = Math.floor(end.x / size) * size;
        const ey = Math.floor(end.y / size) * size;
        return { 
            x: Math.min(sx, ex), y: Math.min(sy, ey), 
            w: (Math.max(sx, ex) - Math.min(sx, ex)) + size, 
            h: (Math.max(sy, ey) - Math.min(sy, ey)) + size 
        };
    }
}