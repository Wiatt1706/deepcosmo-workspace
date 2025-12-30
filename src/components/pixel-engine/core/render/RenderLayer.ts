// core/render/RenderLayer.ts
export abstract class RenderLayer {
  protected dirty = true;

  markDirty() {
    this.dirty = true;
  }

  abstract resize(width: number, height: number): void;
  abstract render(): void;
}
