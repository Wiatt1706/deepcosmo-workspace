// core/render/Renderer.ts
import { CanvasSurface } from "./CanvasSurface";
import { RenderLayer } from "./RenderLayer";
import { Camera } from "../Camera";
export class Renderer {
  private layers: RenderLayer[] = [];

  constructor(
    private surface: CanvasSurface,
    private camera: Camera
  ) {}

  addLayer(layer: RenderLayer) {
    this.layers.push(layer);
  }

  resize(width: number, height: number) {
    this.surface.resize(width, height);
  }

  render() {
    const { ctx } = this.surface;

    // 每帧清空
    this.surface.clear();

    for (const layer of this.layers) {
      if (!layer.visible) continue;

      layer.render(ctx, this.camera);
      layer.clearDirty();
    }
  }

  dispose() {
    this.layers.length = 0;
  }
}
