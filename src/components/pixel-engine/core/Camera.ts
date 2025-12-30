// core/Camera.ts
export class Camera {
  // 世界坐标：屏幕中心对应的 world 点
  center = { x: 0, y: 0 };

  // 缩放因子（1 = 1 world unit = 1 pixelSize）
  scale = 1;

  // 一个 world unit 对应多少物理像素
  pixelSize = 10;

  // 视口（canvas 的 CSS 尺寸）
  viewport = {
    width: 1,
    height: 1,
  };

  // =============================
  // 坐标转换（唯一可信源）
  // =============================

  worldToCanvas(world: { x: number; y: number }) {
    const { width, height } = this.viewport;

    return {
      x:
        (world.x - this.center.x) * this.pixelSize * this.scale +
        width / 2,
      y:
        (world.y - this.center.y) * this.pixelSize * this.scale +
        height / 2,
    };
  }

  canvasToWorld(canvas: { x: number; y: number }) {
    const { width, height } = this.viewport;

    return {
      x:
        (canvas.x - width / 2) / (this.pixelSize * this.scale) +
        this.center.x,
      y:
        (canvas.y - height / 2) / (this.pixelSize * this.scale) +
        this.center.y,
    };
  }

  // =============================
  // 视图操作
  // =============================

  pan(deltaCanvasX: number, deltaCanvasY: number) {
    this.center.x -= deltaCanvasX / (this.pixelSize * this.scale);
    this.center.y -= deltaCanvasY / (this.pixelSize * this.scale);
  }

  zoomAt(worldPoint: { x: number; y: number }, factor: number) {
    const oldScale = this.scale;
    this.scale = Math.max(0.01, Math.min(100, this.scale * factor));

    const ratio = this.scale / oldScale;

    this.center = {
      x: worldPoint.x - (worldPoint.x - this.center.x) * ratio,
      y: worldPoint.y - (worldPoint.y - this.center.y) * ratio,
    };
  }

  resize(width: number, height: number) {
    this.viewport.width = width;
    this.viewport.height = height;
  }
}
