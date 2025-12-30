// core/render/Renderer.ts
import { RenderLayer } from "./RenderLayer";

export class Renderer {
  constructor(
    private layers: RenderLayer[]
  ) {}

  render() {
    for (const layer of this.layers) {
      layer.render();
    }
  }

  resize(w: number, h: number) {
    for (const layer of this.layers) {
      layer.resize(w, h);
    }
  }

  dispose() {
    for (const layer of this.layers) {
      if ('dispose' in layer && typeof (layer as any).dispose === 'function') {
        (layer as any).dispose();
      }
    }
    this.layers.length = 0;
  }

  addLayer(layer: RenderLayer) {
    this.layers.push(layer);
  }

  removeLayer(layer: RenderLayer) {
    const index = this.layers.indexOf(layer);
    if (index !== -1) {
      this.layers.splice(index, 1);
    }
  }
}