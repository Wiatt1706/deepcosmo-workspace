// hooks/usePixelEngine.tsx
import { useEffect, useRef } from "react";
import { PixelEngine } from "./core/PixelEngine";
import { BrushTool } from "./tools/BrushTool";


export function usePixelEngine(
  containerRef: React.RefObject<HTMLDivElement | null>,
  options = {}
) {
  const engineRef = useRef<PixelEngine | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // ✅ 正确：传入div容器，引擎会在其中创建canvas
    const engine = new PixelEngine(containerRef.current, {
      showGrid: true,
      initialScale: 2,
      pixelSize: 10,
      ...options
    });
    
    // 默认使用画笔工具
    const brushTool = new BrushTool();
    engine.setTool(brushTool);
    
    engine.start();
    engineRef.current = engine;

    return () => {
      engine.stop();
    };
  }, [containerRef]);

  return engineRef;
}