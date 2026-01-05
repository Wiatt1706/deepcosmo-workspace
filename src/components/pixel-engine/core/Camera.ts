import { EventEmitter } from "../events/EventEmitter";

export class Camera {
  center = { x: 0, y: 0 };
  scale = 1;
  pixelSize = 10;

  viewport = { width: 1, height: 1 };

  readonly onChange = new EventEmitter();

  worldToCanvas(world: { x: number; y: number }) {
    const { width, height } = this.viewport;
    return {
      x: (world.x - this.center.x) * this.pixelSize * this.scale + width / 2,
      y: (world.y - this.center.y) * this.pixelSize * this.scale + height / 2,
    };
  }

  canvasToWorld(canvas: { x: number; y: number }) {
    const { width, height } = this.viewport;
    return {
      x: (canvas.x - width / 2) / (this.pixelSize * this.scale) + this.center.x,
      y: (canvas.y - height / 2) / (this.pixelSize * this.scale) + this.center.y,
    };
  }

  pan(dx: number, dy: number) {
    this.center.x -= dx / (this.pixelSize * this.scale);
    this.center.y -= dy / (this.pixelSize * this.scale);
    this.onChange.emit();
  }

  zoomAt(world: { x: number; y: number }, factor: number) {
    const oldScale = this.scale;
    this.scale = Math.max(0.1, Math.min(100, this.scale * factor));

    const ratio = this.scale / oldScale;
    this.center = {
      x: world.x - (world.x - this.center.x) * ratio,
      y: world.y - (world.y - this.center.y) * ratio,
    };

    this.onChange.emit();
  }

  resize(w: number, h: number) {
    this.viewport.width = w;
    this.viewport.height = h;
    this.onChange.emit();
  }
}
