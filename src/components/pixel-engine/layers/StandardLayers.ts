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
        // [Fix] 既然要重置变换，就必须填满物理像素尺寸 (ctx.canvas.width/height)
        // 之前的写法除以 dpr 是错误的，因为 resetTransform 后 1单位 = 1物理像素
        ctx.resetTransform(); 
        
        ctx.fillStyle = bgColor;
        // 直接使用 canvas 的物理宽高
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
        // [Optimization] LOD: 视距太远时不画网格，减少 GPU 压力
        if (zoom < 0.4) return;

        // 假设网格大小固定 20，后续可改为从 engine.config 读取
        const gridSize = 20; 
        
        ctx.strokeStyle = 'rgba(55,55,55,0.15)';
        // 线条宽度随缩放调整，保持视觉一致性，但限制最细 0.5px
        ctx.lineWidth = Math.max(0.5 / zoom, 0.5); 
        ctx.beginPath();
        
        // [Optimization] 仅绘制视野范围内的网格
        // 对齐网格起始点，避免滚动时的“抖动”
        const startX = Math.floor(viewRect.left / gridSize) * gridSize;
        const startY = Math.floor(viewRect.top / gridSize) * gridSize;
        
        // 绘制垂线
        for (let x = startX; x < viewRect.right; x += gridSize) {
            ctx.moveTo(x, viewRect.top); 
            ctx.lineTo(x, viewRect.bottom);
        }
        // 绘制水平线
        for (let y = startY; y < viewRect.bottom; y += gridSize) {
            ctx.moveTo(viewRect.left, y); 
            ctx.lineTo(viewRect.right, y);
        }
        ctx.stroke();

        // 绘制坐标轴 (红色 X, 绿色 Y) - 辅助定位
        ctx.lineWidth = 2 / zoom;
        ctx.beginPath();
        ctx.strokeStyle = '#ef4444'; // Red
        ctx.moveTo(Math.max(viewRect.left, 0), 0);
        ctx.lineTo(Math.min(viewRect.right, 100), 0);
        ctx.stroke();

        ctx.beginPath();
        ctx.strokeStyle = '#22c55e'; // Green
        ctx.moveTo(0, Math.max(viewRect.top, 0));
        ctx.lineTo(0, Math.min(viewRect.bottom, 100));
        ctx.stroke();
    }
}

// ==========================================
// 3. 方块世界图层 (BlockLayer)
// ==========================================
export class BlockLayer extends Layer {
    constructor(engine: IEngine) {
        super(engine, 'blocks', 10);
    }

    render({ ctx, viewRect, zoom }: RenderContext) {
        // [Performance] 空间查询：只获取视野内的方块
        const blocks = this.engine.world.queryBlocksInRect(
            viewRect.left, viewRect.top, viewRect.right, viewRect.bottom
        );

        // LOD 状态判断
        const isVeryFar = zoom < 0.2;
        const isCloseUp = zoom > 1.5;

        for (const b of blocks) {
            // 1. LOD Level 0: 极远视距优化 (只画纯色块，忽略图片)
            if (isVeryFar && b.type === 'image') {
                ctx.fillStyle = '#374151'; 
                ctx.fillRect(b.x, b.y, b.w, b.h);
                continue; 
            }

            // 2. 正常绘制
            if (b.type === 'image' && b.imageUrl) {
                // 通过 AssetSystem 获取纹理缓存
                const img = this.engine.assets.getTexture(b.imageUrl);
                
                if (img) {
                    ctx.drawImage(img, b.x, b.y, b.w, b.h);
                } else {
                    // 图片加载中/失败占位符
                    ctx.fillStyle = '#1f2937'; 
                    ctx.fillRect(b.x, b.y, b.w, b.h);
                    
                    if (zoom > 0.8) {
                        ctx.fillStyle = '#6b7280';
                        ctx.font = `${10/zoom}px sans-serif`;
                        // 居中显示 "..."
                        ctx.fillText("...", b.x + b.w/2 - 5/zoom, b.y + b.h/2);
                    }
                }
            } else {
                // 基础色块
                ctx.fillStyle = b.color;
                ctx.fillRect(b.x, b.y, b.w, b.h);
            }

            // 3. LOD Level 2: 近距离细节增强
            if (isCloseUp) {
                // 微弱的描边，增加方块感
                ctx.strokeStyle = 'rgba(255,255,255,0.15)';
                ctx.lineWidth = 1 / zoom; 
                ctx.strokeRect(b.x, b.y, b.w, b.h);

                // 嵌套世界的特殊高亮
                if (b.type === 'nested') {
                    ctx.strokeStyle = '#a855f7'; // Purple
                    ctx.lineWidth = 2 / zoom;
                    ctx.strokeRect(b.x, b.y, b.w, b.h);
                }
            }
        }
    }
}