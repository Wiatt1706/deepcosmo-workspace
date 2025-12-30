import { useEffect, useRef } from "react";
import { PixelEngine } from "./core/PixelEngine";

// react/usePixelEngine.ts
export function usePixelEngine(ref: React.RefObject<HTMLDivElement>) {
  const engineRef = useRef<PixelEngine | null>(null);

  useEffect(() => {
    if (!ref.current) return;

    const canvas = ref.current.querySelector("canvas")!;
    const engine = new PixelEngine(canvas, {
        showGrid: true,
        initialScale: 2,
        pixelSize: 8
    });
    engine.start();

    engineRef.current = engine;
    return () => engine.stop();
  }, []);

  return engineRef;
}
