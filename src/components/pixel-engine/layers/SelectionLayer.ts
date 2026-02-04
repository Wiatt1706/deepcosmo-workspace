// src/engine/layers/SelectionLayer.ts
import { Layer, RenderContext } from '../core/Layer';
import { IEngine } from '../types';

export class SelectionLayer extends Layer {
    constructor(engine: IEngine) {
        super(engine, 'selection', 100);
    }

    render({ ctx, zoom }: RenderContext) {
        const selection = this.engine.selection.currentSelection;
        if (!selection) return;

        // 1. Lifted Blocks (正在拖拽的内容)
        if (this.engine.selection.isLifted) {
            // 获取 SelectionSystem 缓存好的 Preview Canvas
            const cache = this.engine.selection.getPreviewCanvas();
            if (cache && cache.width > 0) {
                ctx.save();
                
                // [Fix] 这里的关键：图片必须画在 selection 当前的位置
                // Tool 更新 selection 的 xy，这里负责渲染
                ctx.drawImage(cache, selection.x, selection.y);
                
                // 可选：绘制一个半透明的背景框，增强拖拽感
                // ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
                // ctx.fillRect(selection.x, selection.y, selection.w, selection.h);
                
                ctx.restore();
            }
        } 
        // 2. Static Selection (静止选区的高亮)
        else if (this.engine.selection.selectedIds.size > 0) {
            ctx.save();
            // 绘制选区内的高亮覆盖层
            // 注意：不要画实心方块，否则会盖住下面的内容。
            // 我们可以简单画一个整体的半透明框
            ctx.fillStyle = 'rgba(59, 130, 246, 0.1)'; // Blue-500 low alpha
            ctx.fillRect(selection.x, selection.y, selection.w, selection.h);
            ctx.restore();
        }

        // 3. Marching Ants (蚂蚁线边框)
        ctx.save();
        const dashOffset = - (performance.now() / 40) % 16;
        ctx.lineWidth = 1 / zoom; // 保持 1px 线宽
        
        const isMulti = this.engine.selection.selectedIds.size > 1;
        
        // 外部白线
        ctx.strokeStyle = isMulti ? '#60a5fa' : '#fff'; 
        ctx.setLineDash([4 / zoom, 4 / zoom]);
        ctx.lineDashOffset = dashOffset / zoom;
        
        // 使用 round 避免 0.5px 模糊
        const rx = Math.round(selection.x);
        const ry = Math.round(selection.y);
        const rw = Math.round(selection.w);
        const rh = Math.round(selection.h);

        ctx.strokeRect(rx, ry, rw, rh);
        
        // 内部黑线 (形成双色虚线，任何背景可见)
        ctx.strokeStyle = '#000';
        ctx.lineDashOffset = (dashOffset / zoom) + (4 / zoom); 
        ctx.strokeRect(rx, ry, rw, rh);

        // Size Label (尺寸提示)
        if (zoom > 0.8 && (this.engine.state.currentTool === 'rectangle-select' || this.engine.selection.isLifted)) {
            const label = `${Math.round(rw)} x ${Math.round(rh)}`;
            ctx.font = `${10/zoom}px sans-serif`;
            const textMetrics = ctx.measureText(label);
            
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            const padding = 4/zoom;
            ctx.fillRect(rx, ry - 16/zoom, textMetrics.width + padding*2, 16/zoom);
            
            ctx.fillStyle = '#fff';
            ctx.textBaseline = 'top';
            ctx.fillText(label, rx + padding, ry - 16/zoom + 2/zoom);
        }
        ctx.restore();
    }
}