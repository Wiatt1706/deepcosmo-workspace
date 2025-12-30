import { EngineState } from "../core/EngineState";

export abstract class AbstractTool {
  readonly name: string;

  constructor(name: string) {
    this.name = name;
  }

  onMouseDown?(state: EngineState, e: MouseEvent): void;
  onMouseMove?(state: EngineState, e: MouseEvent): void;
  onMouseUp?(state: EngineState, e: MouseEvent): void;
  onWheel?(state: EngineState, e: WheelEvent): void;
}
