import { AbstractTool } from "./AbstractTool";
import { EngineState } from "../core/EngineState";
import { simpleBrushPaint } from "../helpers/pixelEditorUtils";

export class BrushTool extends AbstractTool {
  constructor() {
    super("brush");
  }

  onMouseDown(state: EngineState, e: MouseEvent) {
    this.paint(state, e.buttons);
  }

  onMouseMove(state: EngineState, e: MouseEvent) {
    if (state.mouse.buttons !== 0) {
      this.paint(state, e.buttons);
    }
  }

  private paint(state: EngineState, buttons: number) {
    const world = state.mouse.world;
    if (!world) return;

    const isLeft = (buttons & 1) === 1;
    const isRight = (buttons & 2) === 2;

    if (!isLeft && !isRight) return;

    state.pixels.data = simpleBrushPaint(
      world,
      state.pixels.data,
      state.pixels.brushSize,
      state.pixels.currentColor,
      isLeft,
      isRight
    );
  }
}
