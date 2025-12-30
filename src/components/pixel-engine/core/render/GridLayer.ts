import { drawGrid } from "../../helpers/DrawGrid";
import { Camera } from "../Camera";
import { RenderLayer } from "./RenderLayer";

export class GridLayer extends RenderLayer {
  constructor(
    private ctx: CanvasRenderingContext2D,
    private camera: Camera
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
    drawGrid(
      this.ctx,
      this.camera.center,
      this.camera.scale,
      this.camera.pixelSize,
      this.camera.viewport.width,
      this.camera.viewport.height,
      { width: 64, height: 64 }
    );

    this.dirty = false;
  }
}
