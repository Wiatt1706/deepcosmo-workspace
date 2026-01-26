// src/tools/SelectionTool.ts

import { BaseTool } from '../core/ToolBase';
import { Vec2, SelectionRect } from '../types';
import { MathUtils } from '../utils/MathUtils';
import { RemoveBlockCommand, BatchCommand } from '../commands';

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

        if (e.code === 'Delete' || e.code === 'Backspace') {
            e.preventDefault();
            this.deleteSelection();
            return;
        }

        if (e.code === 'Escape') {
            e.preventDefault();
            if (selection.isLifted) selection.abortMove(); 
            else selection.clear();
            this.reset();
            return;
        }

        if (e.code === 'Enter') {
             e.preventDefault();
             if (selection.isLifted) selection.place();
             selection.clear();
             this.reset();
             return;
        }

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

        if (!selection.isLifted) selection.lift();
        selection.setSelection(newRect, true);
    }

    private deleteSelection() {
        const { selection, world, events } = this.engine;
        if (selection.isLifted) {
            if (!selection.place()) return;
        }
        const ids = Array.from(selection.selectedIds);
        if (ids.length === 0) return;

        const commands = ids.map(id => {
            const block = world.getBlockById(id);
            if (block) return new RemoveBlockCommand(world, block.x, block.y, block);
            return null;
        }).filter(c => c !== null) as RemoveBlockCommand[];

        if (commands.length > 0) {
            const batch = new BatchCommand(commands);
            batch.execute();
            events.emit('history:push', batch, true);
        }
        selection.clear();
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
            // MOVING
            const sel = this.engine.selection.currentSelection!; 
            this.state = InteractionState.MOVING;
            this.initialSelectionPos = { x: sel.x, y: sel.y };
            this.dragOffset = { x: pos.x - sel.x, y: pos.y - sel.y };
            this.engine.canvas.style.cursor = 'move';
        } else {
            // SELECTING
            if (this.engine.selection.isLifted) {
                if (!this.engine.selection.place()) return true;
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

        // [Bug Fix] 核心修复逻辑
        // 如果方块处于“浮起”状态 (isLifted)，说明用户已经触发了拖拽行为。
        // 即使此时 dragDist == 0 (用户拖出去又拖回原位)，这依然是一次“放置”操作，而不是“点击”操作。
        // 只有当 isLifted 为 false 且距离很短时，才视为 Click。
        const isDragOperation = this.engine.selection.isLifted;
        const isClick = !isDragOperation && (this.getDragDistance(e) < this.DRAG_THRESHOLD);

        if (isClick) {
            // --- 点击 ---
            const block = this.engine.world.getBlockAt(pos.x, pos.y);
            this.engine.selection.handlePointSelection(block, e.shiftKey);
        } else {
            // --- 放置 / 结束框选 ---
            if (this.state === InteractionState.MOVING) {
                // 如果是 Lifted 状态，执行放置 (place)
                // place 内部会判断：如果位置没变，则执行 abortMove (复位但保留选区)
                // 如果位置变了，则执行 Command
                if (this.engine.selection.isLifted) {
                    this.engine.selection.place();
                }
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
        if (this.state === InteractionState.MOVING && this.initialSelectionPos && this.dragOffset) {
            if (!this.engine.selection.isLifted) {
                const dist = e ? this.getDragDistance(e) : this.DRAG_THRESHOLD + 10;
                if (dist > this.DRAG_THRESHOLD) {
                    this.engine.selection.lift();
                } else {
                    return;
                }
            }
            const gridSize = this.getGridSize();
            const rawTargetX = pos.x - this.dragOffset.x;
            const rawTargetY = pos.y - this.dragOffset.y;
            const snappedTargetX = MathUtils.snap(rawTargetX, gridSize);
            const snappedTargetY = MathUtils.snap(rawTargetY, gridSize);

            const current = this.engine.selection.currentSelection;
            if (current && (current.x !== snappedTargetX || current.y !== snappedTargetY)) {
                this.engine.selection.setSelection({
                    ...current, x: snappedTargetX, y: snappedTargetY
                }, true);
            }
        }
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