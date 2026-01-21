// src/engine/systems/Renderer.ts
import { Camera } from '../core/Camera';
import { LayerManager } from '../core/LayerManager';
import { IEngine, IRenderer } from '../types';

export class Renderer implements IRenderer {
    public ctx: CanvasRenderingContext2D;
    // LayerManager 实现了 ILayerManager，所以这里是兼容的
    public layers: LayerManager;

    constructor(
        private canvas: HTMLCanvasElement,
        private camera: Camera,
        private engine: IEngine 
    ) {
        this.ctx = this.canvas.getContext('2d', { alpha: false })!;
        this.layers = new LayerManager();
    }

    resize() {
        const parent = this.canvas.parentElement;
        if (!parent) return;

        const rect = parent.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;

        this.canvas.width = Math.round(rect.width * dpr);
        this.canvas.height = Math.round(rect.height * dpr);

        this.camera.resize(rect.width, rect.height);
        this.draw();
    }

    draw() {
        const dpr = window.devicePixelRatio || 1;
        const buffer = this.engine.world.chunkSize || 128;

        this.ctx.resetTransform();
        this.ctx.scale(dpr, dpr);

        const viewRect = this.camera.getVisibleBounds(buffer);

        this.ctx.save();
        this.ctx.translate(this.canvas.width / dpr / 2, this.canvas.height / dpr / 2);
        this.ctx.scale(this.camera.zoom, this.camera.zoom);
        this.ctx.translate(-this.camera.x, -this.camera.y);

        // 调用 LayerManager
        this.layers.renderAll({
            ctx: this.ctx,
            viewRect,
            zoom: this.camera.zoom
        });

        this.ctx.restore();
    }
}