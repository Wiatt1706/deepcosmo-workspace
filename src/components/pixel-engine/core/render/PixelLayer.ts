import { Camera } from "../Camera";
import { PixelStore } from "../PixelStore";
import { RenderLayer } from "./RenderLayer";

export class PixelLayer extends RenderLayer {
  constructor(
    private ctx: CanvasRenderingContext2D,
    private camera: Camera,
    private store: PixelStore
  ) {
    super();
  }

  resize(w: number, h: number) {
    this.ctx.canvas.width = w;
    this.ctx.canvas.height = h;
    this.markDirty();
  }

  render() {
    if (!this.dirty) return;

    this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);

    Object.values(this.store.data).forEach(pixel => {
      const pos = this.camera.worldToCanvas({ x: pixel.x, y: pixel.y });
      const size = this.camera.pixelSize * this.camera.scale;

      this.ctx.fillStyle = pixel.color;
      this.ctx.fillRect(
        pos.x,
        pos.y,
        pixel.width * size,
        pixel.height * size
      );
    });

    this.dirty = false;
  }
}
