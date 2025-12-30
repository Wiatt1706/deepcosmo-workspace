// core/PixelStore.ts
import { simpleBrushPaint } from "../helpers/pixelEditorUtils";
import { PixelBlock } from "./types";

export class PixelStore {
  data: Record<string, PixelBlock> = {};

  brushSize = { width: 1, height: 1 };
  currentColor = "#000000";

  paint(world: { x: number; y: number }, isLeft = true, isRight = false) {
    this.data = simpleBrushPaint(
      {
        x: Math.floor(world.x),
        y: Math.floor(world.y),
      },
      this.data,
      this.brushSize,
      this.currentColor,
      isLeft,
      isRight
    );
  }
}
