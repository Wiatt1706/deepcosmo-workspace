"use client";
import React, { useEffect, useRef } from "react";
import { Engine } from "./core/Engine";
import { World } from "./core/World"; // 默认 World
import { EditorToolsPlugin } from "./plugins/EditorToolsPlugin";
import { HistoryPlugin } from "./plugins/HistoryPlugin";
import { NestedWorldPlugin } from "./plugins/NestedWorldPlugin";
import { ViewerPlugin } from "./plugins/ViewerPlugin";
import { 
    BrushTool, 
    EraserTool, 
    RectangleTool, 
    PortalTool 
} from "./tools/StandardTools";
import { usePixelEngine } from "./PixelContext";
import { EditorMode } from "@/app/[locale]/(main)/worlds/_lib/modeStore";

interface Props {
    mode: EditorMode;
}

export default function PixelCanvas({ mode }: Props) {
    const containerRef = useRef<HTMLDivElement>(null);
    const { setEngine } = usePixelEngine();
    const engineInstanceRef = useRef<Engine | null>(null);
    const isInitializing = useRef(false);

    useEffect(() => {
        if (!containerRef.current || isInitializing.current) return;
        // 如果模式改变，我们销毁旧引擎重建新引擎
        // (实际项目中也可以选择不销毁，而是热切换 Plugin，这里为了演示 DI 选择重建)
        if (engineInstanceRef.current) {
             engineInstanceRef.current.destroy();
             engineInstanceRef.current = null;
        }

        isInitializing.current = true;

        // 1. 配置
        const config = {
            container: containerRef.current,
            backgroundColor: mode === 'editor' ? '#111827' : '#000000',
            readOnly: mode === 'project',
        };

        // 2. [DI] 组装系统
        // 在这里，你可以根据 mode 选择不同的 World 实现或 Input 实现
        // 例如：浏览模式下，可以使用一个只读的、内存占有率更低的 OptimizedWorld
        const systems = {
            world: new World(128), // 这里以后可以换成 new QuadTreeWorld()
            // input: mode === 'mobile' ? new TouchInputSystem(...) : undefined
        };

        // 3. 注入
        const engine = new Engine(config, systems);

        // 4. 注册插件 (这也是一种 DI，功能注入)
        if (mode === 'editor') {
            const editorPlugin = new EditorToolsPlugin([
                new BrushTool(engine),
                new EraserTool(engine),
                new RectangleTool(engine),
                new PortalTool(engine)
            ]);
            
            engine.registerPlugin(editorPlugin);
            engine.registerPlugin(new HistoryPlugin());
            engine.registerPlugin(new NestedWorldPlugin());
        } else {
            engine.registerPlugin(new ViewerPlugin());
        }

        engineInstanceRef.current = engine;
        setEngine(engine); 

        isInitializing.current = false;

        return () => {
            if (engineInstanceRef.current) {
                engineInstanceRef.current.destroy();
                engineInstanceRef.current = null;
            }
        };
    }, [mode, setEngine]);

    return <div ref={containerRef} className="relative w-full h-full touch-none outline-none bg-gray-900 overflow-hidden" />;
}