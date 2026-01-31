// src/tools/HandTool.ts
// (代码大体不变，但要确保它干净)
import { BaseTool } from '../core/ToolBase';
import { Vec2 } from '../types';

export class HandTool extends BaseTool {
    name = 'hand';
    private isDragging = false;
    private lastMousePos: { x: number, y: number } | null = null;
    private dragStartPos: { x: number, y: number } | null = null;
    private readonly DRAG_THRESHOLD = 3;

    onActivate() {
        // 如果正在拖拽中（比如空格还没松开就切过来了），保持 grabbing
        this.engine.canvas.style.cursor = this.isDragging ? 'grabbing' : 'grab';
    }

    onDeactivate() {
        this.engine.canvas.style.cursor = 'default';
        this.isDragging = false;
        this.lastMousePos = null;
    }

    onMouseDown(worldPos: Vec2, e: MouseEvent): boolean {
        // 中键也可以触发拖拽，这很符合习惯
        if (e.button === 0 || e.button === 1) { 
            this.lastMousePos = { x: e.clientX, y: e.clientY };
            this.dragStartPos = { x: e.clientX, y: e.clientY };
            this.isDragging = true;
            this.engine.canvas.style.cursor = 'grabbing';
            return true;
        }
        return false;
    }

    onMouseMove(worldPos: Vec2, e: MouseEvent): boolean {
        if (!this.isDragging || !this.lastMousePos) return false;
        const dx = e.clientX - this.lastMousePos.x;
        const dy = e.clientY - this.lastMousePos.y;
        this.engine.camera.panBy(dx, dy);
        this.lastMousePos = { x: e.clientX, y: e.clientY };
        this.engine.requestRender();
        return true;
    }

    onMouseUp(worldPos: Vec2, e: MouseEvent): boolean {
        // 只有左键抬起才算点击
        if (e.button === 0) {
            const dist = this.getDragDistance(e);
            if (dist < this.DRAG_THRESHOLD) {
                // [优化] 点击触发
                const block = this.engine.world.getBlockAt(worldPos.x, worldPos.y);
                if (block) {
                    this.engine.events.emit('editor:block-click', block);
                }
            }
        }
        
        this.isDragging = false;
        this.engine.canvas.style.cursor = 'grab';
        this.lastMousePos = null;
        this.dragStartPos = null;
        return true;
    }

    onRender(ctx: CanvasRenderingContext2D) {} // 无需渲染

    private getDragDistance(e: MouseEvent) {
        if (!this.dragStartPos) return 999;
        return Math.abs(e.clientX - this.dragStartPos.x) + Math.abs(e.clientY - this.dragStartPos.y);
    }
}