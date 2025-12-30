import { EngineState } from "../core/EngineState";
import { AbstractTool } from "./AbstractTool";

export class PanTool extends AbstractTool {
  constructor() {
    super("pan");
  }

  onMouseMove(state: EngineState) {
    if (!state.interaction.isDragging) return;

    const start = state.interaction.dragStart;
    if (!start) return;

    const dx = state.mouse.canvas!.x - start.x;
    const dy = state.mouse.canvas!.y - start.y;

    state.camera.pan(dx, dy);

    state.interaction.dragStart = {
      x: state.mouse.canvas!.x,
      y: state.mouse.canvas!.y,
    };
  }
}
