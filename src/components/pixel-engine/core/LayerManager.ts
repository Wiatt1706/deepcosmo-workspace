// src/engine/core/LayerManager.ts
import { ILayerManager, ILayer, RenderContext } from '../types';

export class LayerManager implements ILayerManager {
    // 这里使用 ILayer 接口而不是 Layer 基类，增加兼容性
    private layers: ILayer[] = [];
    private layerMap: Map<string, ILayer> = new Map();
    private needsSort: boolean = false;

    add(layer: ILayer) {
        if (this.layerMap.has(layer.name)) {
            console.warn(`Layer ${layer.name} already exists.`);
            return;
        }
        this.layers.push(layer);
        this.layerMap.set(layer.name, layer);
        
        if (layer.onInit) layer.onInit();
        
        this.needsSort = true;
    }

    remove(name: string) {
        const layer = this.layerMap.get(name);
        if (layer) {
            if (layer.onDestroy) layer.onDestroy();
            this.layers = this.layers.filter(l => l !== layer);
            this.layerMap.delete(name);
        }
    }

    get(name: string): ILayer | undefined {
        return this.layerMap.get(name);
    }

    renderAll(context: RenderContext) {
        if (this.needsSort) {
            this.layers.sort((a, b) => a.zIndex - b.zIndex);
            this.needsSort = false;
        }

        for (const layer of this.layers) {
            if (layer.isVisible) {
                layer.render(context);
            }
        }
    }

    clear() {
        this.layers.forEach(l => l.onDestroy && l.onDestroy());
        this.layers = [];
        this.layerMap.clear();
    }
}