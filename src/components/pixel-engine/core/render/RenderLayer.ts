// core/render/RenderLayer.ts

import { Camera } from "../Camera";

export abstract class RenderLayer {
  visible = true;
  protected dirty = true;

  markDirty() {
    this.dirty = true;
  }

  clearDirty() {
    this.dirty = false;
  }

  abstract render(
    ctx: CanvasRenderingContext2D,
    camera: Camera
  ): void;
}
