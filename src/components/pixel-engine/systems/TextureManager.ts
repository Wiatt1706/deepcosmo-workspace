export class TextureManager {
  private cache: Map<string, HTMLImageElement> = new Map();
  private pending: Set<string> = new Set();

  get(url: string, onLoaded?: () => void): HTMLImageElement | undefined {
    if (this.cache.has(url)) return this.cache.get(url);
    if (this.pending.has(url)) return undefined;

    this.pending.add(url);
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.src = url;
    img.onload = () => {
      this.cache.set(url, img);
      this.pending.delete(url);
      if (onLoaded) onLoaded();
    };
    return undefined;
  }
}