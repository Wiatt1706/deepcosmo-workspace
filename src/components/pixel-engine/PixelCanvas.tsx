"use client";
import React, { useEffect, useRef } from "react";
import { Engine } from "./core/Engine";
import { World } from "./core/World"; 
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
// [New] 导入选区工具
import { SelectionTool } from "./tools/SelectionTool";

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
        if (engineInstanceRef.current) {
             engineInstanceRef.current.destroy();
             engineInstanceRef.current = null;
        }

        isInitializing.current = true;

        const config = {
            container: containerRef.current,
            backgroundColor: mode === 'editor' ? '#111827' : '#000000',
            readOnly: mode === 'project',
        };

        const systems = {
            // 这里使用我们新的高性能 SpatialHashWorld
            world: new World(128),
        };

        const engine = new Engine(config, systems);

        if (mode === 'editor') {
            const editorPlugin = new EditorToolsPlugin([
                new BrushTool(engine),
                new EraserTool(engine),
                new RectangleTool(engine),
                new PortalTool(engine),
                // [New] 注册选区工具
                new SelectionTool(engine)
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