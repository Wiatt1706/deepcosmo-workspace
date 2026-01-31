// src/engine/layers/StandardLayers.ts
import { Layer, RenderContext } from '../core/Layer';
import { IEngine, PixelBlock } from '../types';

export class BackgroundLayer extends Layer {
    constructor(engine: IEngine) { super(engine, 'background', -100); }
    render({ ctx }: RenderContext) {
        const bgColor = this.engine.config.backgroundColor || '#f5f6f8';
        ctx.save();
        ctx.resetTransform(); 
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        ctx.restore();
    }
}

export class GridLayer extends Layer {
    constructor(engine: IEngine) { super(engine, 'grid', 0); }
    render({ ctx, viewRect, zoom }: RenderContext) {
        if (zoom < 0.4) return;
        const gridSize = this.engine.config.gridSize || 20; 
        
        ctx.strokeStyle = 'rgba(55,55,55,0.15)';
        ctx.lineWidth = Math.max(0.5 / zoom, 0.5); 
        ctx.beginPath();
        
        const startX = Math.floor(viewRect.left / gridSize) * gridSize;
        const startY = Math.floor(viewRect.top / gridSize) * gridSize;
        
        for (let x = startX; x < viewRect.right; x += gridSize) {
            ctx.moveTo(x, viewRect.top); ctx.lineTo(x, viewRect.bottom);
        }
        for (let y = startY; y < viewRect.bottom; y += gridSize) {
            ctx.moveTo(viewRect.left, y); ctx.lineTo(viewRect.right, y);
        }
        ctx.stroke();

        // 坐标轴
        ctx.lineWidth = 2 / zoom;
        ctx.beginPath();
        ctx.strokeStyle = '#ef4444'; 
        ctx.moveTo(Math.max(viewRect.left, 0), 0); ctx.lineTo(Math.min(viewRect.right, 100), 0);
        ctx.stroke();
        ctx.beginPath();
        ctx.strokeStyle = '#22c55e'; 
        ctx.moveTo(0, Math.max(viewRect.top, 0)); ctx.lineTo(0, Math.min(viewRect.bottom, 100));
        ctx.stroke();
    }
}

export class BlockLayer extends Layer {
    constructor(engine: IEngine) { super(engine, 'blocks', 10); }

    render({ ctx, viewRect, zoom }: RenderContext) {
        const blocks = this.engine.world.queryBlocksInRect(
            viewRect.left, viewRect.top, viewRect.right, viewRect.bottom
        );

        // [Optimization 1] Z-Index 排序
        // 确保 y 轴更靠下的物体渲染在更上面 (2.5D 效果) 或者依靠 zIndex 属性
        // 这里我们优先使用 zIndex，如果 zIndex 相同，则使用 y 轴 (简单的遮挡关系)
        blocks.sort((a, b) => {
            const zA = a.zIndex || 0;
            const zB = b.zIndex || 0;
            if (zA !== zB) return zA - zB;
            // 如果 Z 轴相同，为了防止闪烁，可以使用 ID 或坐标做二级排序
            return a.y - b.y || a.x - b.x; 
        });

        const isVeryFar = zoom < 0.2;
        const isCloseUp = zoom > 1.5;
        let lastColor: string | null = null;

        for (const b of blocks) {
            // ... (原有的渲染逻辑保持不变)
            if (isVeryFar && b.type === 'image') {
                if (lastColor !== '#374151') { ctx.fillStyle = '#374151'; lastColor = '#374151'; }
                ctx.fillRect(b.x, b.y, b.w, b.h);
                continue; 
            }

            if (b.type === 'image' && b.imageUrl) {
                const img = this.engine.assets.getTexture(b.imageUrl);
                if (img) {
                    ctx.drawImage(img, b.x, b.y, b.w, b.h);
                } else {
                    if (lastColor !== '#1f2937') { ctx.fillStyle = '#1f2937'; lastColor = '#1f2937'; }
                    ctx.fillRect(b.x, b.y, b.w, b.h);
                    if (zoom > 0.8) {
                        ctx.save();
                        ctx.fillStyle = '#6b7280';
                        ctx.font = `${10/zoom}px sans-serif`;
                        ctx.fillText("...", b.x + b.w/2 - 5/zoom, b.y + b.h/2);
                        ctx.restore();
                        lastColor = null; 
                    }
                }
            } else {
                if (b.color !== lastColor) { ctx.fillStyle = b.color; lastColor = b.color; }
                ctx.fillRect(b.x, b.y, b.w, b.h);
            }

            if (isCloseUp) {
                ctx.lineWidth = 1 / zoom; 
                if (b.type === 'nested') {
                    ctx.strokeStyle = '#a855f7';
                    ctx.lineWidth = 2 / zoom;
                } else {
                    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
                }
                ctx.strokeRect(b.x, b.y, b.w, b.h);
            }
        }
    }
}