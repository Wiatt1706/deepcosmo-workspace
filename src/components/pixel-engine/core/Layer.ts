// src/engine/core/Layer.ts
import { IEngine, ILayer, RenderContext } from '../types';

// 重新导出 Context 方便其他文件使用 (可选)
export type { RenderContext };

/**
 * [Core] 图层基类
 */
export abstract class Layer implements ILayer {
    constructor(
        protected engine: IEngine, 
        public name: string, 
        public zIndex: number = 0
    ) {}

    public isVisible: boolean = true;
    public shouldCull: boolean = true;

    onInit?(): void;
    abstract render(context: RenderContext): void;
    onDestroy?(): void;
}