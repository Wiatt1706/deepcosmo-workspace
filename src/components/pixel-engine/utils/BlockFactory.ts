// src/engine/utils/BlockFactory.ts
import { EngineState, PixelBlock } from '../types';
import { MathUtils } from './MathUtils';

export class BlockFactory {
    
    // [Fix] 辅助方法：兼容 string (旧) 和 object (新) 两种格式
    private static getImageUrl(state: EngineState): string | null {
        if (!state.activeImage) return null;
        
        // 如果是新架构的对象格式
        if (typeof state.activeImage === 'object' && 'url' in state.activeImage) {
            return state.activeImage.url;
        }
        
        // 如果是旧架构的字符串格式 (直接 Base64)
        if (typeof state.activeImage === 'string') {
            return state.activeImage;
        }
        
        return null;
    }

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

        const imageUrl = this.getImageUrl(state);

        // [Fix] 使用兼容处理后的 imageUrl 判断
        if (state.fillMode === 'image' && imageUrl) {
            return {
                ...baseBlock,
                type: 'image',
                imageUrl: imageUrl,
                color: '#ffffff'
            };
        } else {
            return {
                ...baseBlock,
                type: 'basic',
                color: state.activeColor
            };
        }
    }

    public static createRectBlock(
        state: EngineState,
        rect: { x: number, y: number, w: number, h: number }
    ): PixelBlock {
        const id = MathUtils.generateId('rect');
        const imageUrl = this.getImageUrl(state);
        
        // [Fix] 使用兼容处理后的 imageUrl 判断
        if (state.fillMode === 'image' && imageUrl) {
            return {
                id,
                ...rect,
                type: 'image',
                imageUrl: imageUrl,
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