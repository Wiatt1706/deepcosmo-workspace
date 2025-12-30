import { drawGhostBrush } from "../../helpers/DrawGhostBrush";
import { Camera } from "../Camera";
import { EngineState } from "../EngineState";
import { RenderLayer } from "./RenderLayer";

export class OverlayLayer extends RenderLayer {
  constructor(
    private ctx: CanvasRenderingContext2D,
    private camera: Camera,
    private state: EngineState
  ) {
    super();
  }

  resize(w: number, h: number) {
    this.ctx.canvas.width = w;
    this.ctx.canvas.height = h;
  }

  render() {
    this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);

    if (!this.state.mouse.canvas) return;

    drawGhostBrush(
      this.ctx,
      this.state.mouse.canvas,
      this.camera.center,
      this.camera.scale,
      this.camera.pixelSize,
      this.camera.viewport.width,
      this.camera.viewport.height,
      this.state.pixels.brushSize,
      this.state.pixels.currentColor
    );
  }
}
