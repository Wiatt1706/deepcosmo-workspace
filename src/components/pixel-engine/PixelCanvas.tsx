// src/components/pixel-engine/PixelCanvas.tsx
"use client";
import React, { useEffect, useRef } from "react";
import { Engine } from "./core/Engine";
import { EditorToolsPlugin } from "./plugins/EditorToolsPlugin";
import { HistoryPlugin } from "./plugins/HistoryPlugin";
import { NestedWorldPlugin } from "./plugins/NestedWorldPlugin";
import { ViewerPlugin } from "./plugins/ViewerPlugin";
// [New] 导入标准工具
import { 
    BrushTool, 
    EraserTool, 
    RectangleTool, 
    PortalTool 
} from "./tools/StandardTools";

import { usePixelEngine } from "./PixelContext";
// 注意：请确保 EditorMode 的引用路径正确
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
        if (engineInstanceRef.current) return;

        isInitializing.current = true;

        const config = {
            container: containerRef.current,
            backgroundColor: mode === 'editor' ? '#111827' : '#000000',
            readOnly: mode === 'project',
        };

        const engine = new Engine(config);

        // 注册插件
        if (mode === 'editor') {
            // [Dependency Injection] 在这里注入工具
            // 这意味着 EditorToolsPlugin 不再依赖具体实现，完全解耦
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