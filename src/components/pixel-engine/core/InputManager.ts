// core/InputManager.ts
import { EngineState } from "./EngineState";

export class InputManager {
  constructor(
    private canvas: HTMLCanvasElement,
    private state: EngineState
  ) {
    this.bind();
  }

  // ===============================
  // 绑定 / 卸载
  // ===============================

  bind() {
    this.canvas.addEventListener("mousemove", this.onMouseMove);
    this.canvas.addEventListener("mousedown", this.onMouseDown);
    this.canvas.addEventListener("mouseup", this.onMouseUp);
    this.canvas.addEventListener("wheel", this.onWheel, { passive: false });
    this.canvas.addEventListener("contextmenu", this.onContextMenu);
    this.canvas.addEventListener("mouseleave", this.onMouseLeave);
  }

  dispose() {
    this.canvas.removeEventListener("mousemove", this.onMouseMove);
    this.canvas.removeEventListener("mousedown", this.onMouseDown);
    this.canvas.removeEventListener("mouseup", this.onMouseUp);
    this.canvas.removeEventListener("wheel", this.onWheel);
    this.canvas.removeEventListener("contextmenu", this.onContextMenu);
    this.canvas.removeEventListener("mouseleave", this.onMouseLeave);
  }

  // ===============================
  // 坐标转换
  // ===============================

  private getCanvasPos(e: MouseEvent) {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }

  // ===============================
  // 事件处理
  // ===============================

  onMouseMove = (e: MouseEvent) => {
    const canvas = this.getCanvasPos(e);
    
    this.state.mouse.canvas = canvas;
    this.state.mouse.world = this.state.camera.canvasToWorld(canvas);

    this.state.activeTool?.onMouseMove?.(this.state, e);
  };

  onMouseDown = (e: MouseEvent) => {
    e.preventDefault();

    const canvasPos = this.getCanvasPos(e);
    
    this.state.mouse.canvas = canvasPos;
    this.state.mouse.world = this.state.camera.canvasToWorld(canvasPos);
    this.state.mouse.buttons = e.buttons;

    this.state.interaction.isDragging = true;
    this.state.interaction.dragStart = { x: e.clientX, y: e.clientY };

    this.state.activeTool?.onMouseDown?.(this.state, e);
  };

  onMouseUp = (e: MouseEvent) => {
    this.state.mouse.buttons = 0;
    this.state.interaction.isDragging = false;
    this.state.interaction.dragStart = null;

    this.state.activeTool?.onMouseUp?.(this.state, e);
  };

  onMouseLeave = () => {
    this.state.mouse.canvas = null;
    this.state.mouse.world = null;
    this.state.mouse.buttons = 0;
    this.state.interaction.isDragging = false;
  };

  onWheel = (e: WheelEvent) => {
    e.preventDefault();
    this.state.activeTool?.onWheel?.(this.state, e);
  };

  onContextMenu = (e: MouseEvent) => {
    e.preventDefault();
  };
}