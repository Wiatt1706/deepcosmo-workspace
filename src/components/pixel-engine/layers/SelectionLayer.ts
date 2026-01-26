// src/layers/SelectionLayer.ts

import { Layer, RenderContext } from '../core/Layer';
import { IEngine } from '../types';

export class SelectionLayer extends Layer {
    constructor(engine: IEngine) {
        super(engine, 'selection', 100);
    }

    render({ ctx, zoom }: RenderContext) {
        const selection = this.engine.selection.currentSelection;
        if (!selection) return;

        // 1. Lifted Preview (Cache)
        if (this.engine.selection.isLifted) {
            const cache = this.engine.selection.getPreviewCanvas();
            if (cache) {
                // [Geek Style] 移除阴影，只绘制纯净的像素内容
                ctx.save();
                
                // 绘制浮起内容
                ctx.drawImage(cache, selection.x, selection.y);
                
                // 可选：如果希望即便浮起了也有个淡淡的虚框表示边界，可以保留下面这行
                // ctx.strokeRect(selection.x, selection.y, selection.w, selection.h);
                
                ctx.restore();
            }
        } 
        
        // 2. Discrete Selection Highlight (Static 状态)
        else if (this.engine.selection.selectedIds.size > 0) {
            ctx.save();
            const blocks = this.engine.world.queryBlocksInRect(
                selection.x, selection.y, 
                selection.x + selection.w, selection.y + selection.h
            );
            const ids = this.engine.selection.selectedIds;
            
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.lineWidth = 1 / zoom;
            
            ctx.beginPath();
            for (const b of blocks) {
                if (ids.has(b.id)) {
                    ctx.rect(b.x, b.y, b.w, b.h);
                }
            }
            ctx.stroke();
            ctx.restore();
        }

        // 3. Marching Ants (蚂蚁线框)
        ctx.save();
        const dashOffset = - (performance.now() / 40) % 16;
        ctx.lineWidth = 1 / zoom;
        
        const isMulti = this.engine.selection.selectedIds.size > 1;
        ctx.strokeStyle = isMulti ? '#60a5fa' : '#fff'; 
        
        // 使用 round 确保边框锐利，不模糊
        // 偏移 0.5px 是 Canvas 绘制 1px 线条变清晰的技巧，但在缩放下可能不需要，视情况而定
        const rx = Math.round(selection.x);
        const ry = Math.round(selection.y);
        const rw = Math.round(selection.w);
        const rh = Math.round(selection.h);

        ctx.setLineDash([4 / zoom, 4 / zoom]);
        ctx.lineDashOffset = dashOffset / zoom;
        ctx.strokeRect(rx, ry, rw, rh);
        
        if (!isMulti) {
            ctx.strokeStyle = '#000';
            ctx.lineDashOffset = (dashOffset / zoom) + (4 / zoom); 
            ctx.strokeRect(rx, ry, rw, rh);
        }

        // Size Label (保持原有)
        if (zoom > 0.8) {
            const label = `${rw} x ${rh}`;
            ctx.font = `${10/zoom}px sans-serif`;
            const textMetrics = ctx.measureText(label);
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.fillRect(rx, ry - 14/zoom, textMetrics.width + 8/zoom, 14/zoom);
            ctx.fillStyle = '#fff';
            ctx.textBaseline = 'top';
            ctx.fillText(label, rx + 4/zoom, ry - 14/zoom + 2/zoom);
        }
        ctx.restore();
    }
}