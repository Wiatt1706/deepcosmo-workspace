// src/engine/layers/StandardLayers.ts
import { Layer, RenderContext } from '../core/Layer';
import { IEngine } from '../types';

// ==========================================
// 1. 背景图层 (BackgroundLayer)
// ==========================================
export class BackgroundLayer extends Layer {
    constructor(engine: IEngine) {
        super(engine, 'background', -100);
    }

    render({ ctx }: RenderContext) {
        const bgColor = this.engine.config.backgroundColor || '#f5f6f8';
        
        ctx.save();
        ctx.resetTransform(); 
        
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        
        ctx.restore();
    }
}

// ==========================================
// 2. 网格图层 (GridLayer)
// ==========================================
export class GridLayer extends Layer {
    constructor(engine: IEngine) {
        super(engine, 'grid', 0);
    }

    render({ ctx, viewRect, zoom }: RenderContext) {
        // LOD 优化：视距太远不画网格
        if (zoom < 0.4) return;

        const gridSize = this.engine.config.gridSize || 20; 
        
        ctx.strokeStyle = 'rgba(55,55,55,0.15)';
        ctx.lineWidth = Math.max(0.5 / zoom, 0.5); 
        ctx.beginPath();
        
        const startX = Math.floor(viewRect.left / gridSize) * gridSize;
        const startY = Math.floor(viewRect.top / gridSize) * gridSize;
        
        for (let x = startX; x < viewRect.right; x += gridSize) {
            ctx.moveTo(x, viewRect.top); 
            ctx.lineTo(x, viewRect.bottom);
        }
        for (let y = startY; y < viewRect.bottom; y += gridSize) {
            ctx.moveTo(viewRect.left, y); 
            ctx.lineTo(viewRect.right, y);
        }
        ctx.stroke();

        // 坐标轴
        ctx.lineWidth = 2 / zoom;
        ctx.beginPath();
        ctx.strokeStyle = '#ef4444'; // Red X
        ctx.moveTo(Math.max(viewRect.left, 0), 0);
        ctx.lineTo(Math.min(viewRect.right, 100), 0);
        ctx.stroke();

        ctx.beginPath();
        ctx.strokeStyle = '#22c55e'; // Green Y
        ctx.moveTo(0, Math.max(viewRect.top, 0));
        ctx.lineTo(0, Math.min(viewRect.bottom, 100));
        ctx.stroke();
    }
}

// ==========================================
// 3. 方块世界图层 (BlockLayer) - 百万级优化版
// ==========================================
export class BlockLayer extends Layer {
    constructor(engine: IEngine) {
        super(engine, 'blocks', 10);
    }

    render({ ctx, viewRect, zoom }: RenderContext) {
        // [Zero-GC] 获取视野内的索引列表 (number[])
        const indices = this.engine.world.queryIndicesInRect(
            viewRect.left, viewRect.top, viewRect.right, viewRect.bottom
        );

        // 直接访问内存
        const memory = this.engine.world.memory;
        
        const isVeryFar = zoom < 0.2;
        const isCloseUp = zoom > 1.5;
        
        // 颜色状态缓存，减少 Context 切换开销
        let lastColorInt: number = -1;

        for (let i = 0; i < indices.length; i++) {
            const idx = indices[i];
            
            // Direct Memory Access (Fast!)
            const x = memory.x[idx];
            const y = memory.y[idx];
            const w = memory.w[idx];
            const h = memory.h[idx];
            const type = memory.type[idx];
            
            // LOD 0: 极远视距，统一显示灰色
            if (isVeryFar && type === 1) { 
                ctx.fillStyle = '#374151'; 
                ctx.fillRect(x, y, w, h);
                lastColorInt = -1; // 打断缓存
                continue; 
            }

            // Draw Logic
            if (type === 1) { // Image
                const urlIdx = memory.extraId[idx];
                const url = memory.extraPalette[urlIdx];
                const img = this.engine.assets.getTexture(url);
                
                if (img) {
                    ctx.drawImage(img, x, y, w, h);
                } else {
                    // 图片未加载或错误时的占位
                    ctx.fillStyle = '#1f2937'; 
                    ctx.fillRect(x, y, w, h);
                    
                    if (zoom > 0.8) {
                        ctx.save();
                        ctx.fillStyle = '#6b7280';
                        ctx.font = `${10/zoom}px sans-serif`;
                        // 简单的居中文字
                        const tx = x + w/2;
                        const ty = y + h/2;
                        ctx.fillText("...", tx, ty);
                        ctx.restore();
                    }
                }
                lastColorInt = -1; 
            } 
            else { // Basic (0) or Nested (2)
                const c = memory.color[idx];
                
                if (c !== lastColorInt) {
                    // [Fixed] 颜色修复：整数转 16 进制字符串
                    // 0xRRGGBB -> #RRGGBB
                    const hex = '#' + c.toString(16).padStart(6, '0');
                    ctx.fillStyle = hex;
                    lastColorInt = c;
                }
                ctx.fillRect(x, y, w, h);
            }

            // LOD 2: 近距离描边细节
            if (isCloseUp) {
                ctx.lineWidth = 1 / zoom; 
                if (type === 2) { // Nested Portal Highlight
                    ctx.strokeStyle = '#a855f7'; // Purple
                    ctx.lineWidth = 2 / zoom;
                } else {
                    ctx.strokeStyle = 'rgba(255,255,255,0.15)'; // Subtle border
                }
                ctx.strokeRect(x, y, w, h);
            }
        }
    }
}