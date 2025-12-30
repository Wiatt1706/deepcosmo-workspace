import { AbstractTool } from "../tools/AbstractTool";
import { Camera } from "./Camera";
import { PixelStore } from "./PixelStore";

export class EngineState {
  camera = new Camera();
  pixels = new PixelStore();

  mouse = {
    canvas: null as { x: number; y: number } | null,
    world: null as { x: number; y: number } | null,
    buttons: 0,
  };

  interaction = {
    isDragging: false,
    dragStart: null as { x: number; y: number } | null,
  };

  activeTool: AbstractTool | null = null;
}
