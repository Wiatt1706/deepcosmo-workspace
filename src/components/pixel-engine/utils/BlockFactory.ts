// src/engine/utils/BlockFactory.ts
import { EngineState, PixelBlock } from '../types';
import { MathUtils } from './MathUtils';

/**
 * [Commercial-Grade] 方块生产工厂
 * 负责根据当前的 EngineState 生成对应的 Block 数据。
 * 让工具 (Tool) 只关注“位置”，让工厂关注“内容”。
 */
export class BlockFactory {
    
    /**
     * 生成单个标准方块 (用于 Brush)
     */
    public static createBlock(
        state: EngineState, 
        x: number, 
        y: number, 
        size: number
    ): PixelBlock {
        const baseBlock = {
            id: MathUtils.generateId('b'),
            x, y, w: size, h: size,
            zIndex: 1
        };

        if (state.fillMode === 'image' && state.activeImage) {
            return {
                ...baseBlock,
                type: 'image',
                imageUrl: state.activeImage,
                color: '#ffffff' // 图片模式下，color 可作为底色
            };
        } else {
            return {
                ...baseBlock,
                type: 'basic',
                color: state.activeColor
            };
        }
    }

    /**
     * 生成矩形区域方块 (用于 Rectangle)
     */
    public static createRectBlock(
        state: EngineState,
        rect: { x: number, y: number, w: number, h: number }
    ): PixelBlock {
        const id = MathUtils.generateId('rect');
        
        if (state.fillMode === 'image' && state.activeImage) {
            return {
                id,
                ...rect,
                type: 'image',
                imageUrl: state.activeImage,
                color: '#ffffff'
            };
        } else {
            return {
                id,
                ...rect,
                type: 'basic',
                color: state.activeColor
            };
        }
    }
}