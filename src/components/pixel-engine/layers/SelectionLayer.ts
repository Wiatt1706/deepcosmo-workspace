import { Layer, RenderContext } from '../core/Layer';
import { IEngine } from '../types';

/**
 * [Layer] 选区渲染层
 * 职责：
 * 1. 绘制“蚂蚁线”动画 (Marching Ants)。
 * 2. 绘制粘贴/移动过程中的预览块 (Lifted Preview)。
 */
export class SelectionLayer extends Layer {
    constructor(engine: IEngine) {
        // zIndex 100: 在方块(10)之上，在工具UI(200)之下
        super(engine, 'selection', 100);
    }

    render({ ctx, zoom }: RenderContext) {
        const selection = this.engine.selection.currentSelection;
        if (!selection) return;

        // --- 1. 绘制选区边界 (Marching Ants) ---
        ctx.save();
        
        // 动态计算虚线偏移，产生流动效果
        // performance.now() 毫秒级时间戳，除以 50 控制速度
        const dashOffset = - (performance.now() / 40) % 16;
        
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1 / zoom; // 保持 1px 细线
        ctx.setLineDash([4 / zoom, 4 / zoom]); // 虚线间隔随缩放调整
        ctx.lineDashOffset = dashOffset / zoom;
        
        // 绘制白线
        ctx.strokeRect(selection.x, selection.y, selection.w, selection.h);
        
        // 绘制黑线 (反色)，确保在任何背景下可见
        ctx.strokeStyle = '#000';
        ctx.lineDashOffset = (dashOffset / zoom) + (4 / zoom); 
        ctx.strokeRect(selection.x, selection.y, selection.w, selection.h);
        
        // 绘制尺寸标签 (可选)
        if (zoom > 1) {
            ctx.fillStyle = '#fff';
            ctx.font = `${10/zoom}px monospace`;
            ctx.textBaseline = 'bottom';
            ctx.fillText(
                `${selection.w}x${selection.h}`, 
                selection.x, 
                selection.y - 2/zoom
            );
        }

        ctx.restore();

        // --- 2. (可选) 绘制 Lifted Preview ---
        // 如果你需要在这里渲染正在被拖拽的像素（例如移动选区时），
        // 可以遍历 engine.selection.liftedBlocks 进行绘制。
        // 目前我们暂只画框。
    }
}