"use client";
import React, { useEffect, useRef } from "react";
import { Engine } from "./core/Engine";
import { World } from "./core/World"; 
import { EditorToolsPlugin } from "./plugins/EditorToolsPlugin";
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
import { BlockInspector } from "./_components/BlockInspector";
import { HandTool } from "./tools/HandTool";
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
            backgroundColor: mode === 'editor' ? '#fff' : '#fff',
            readOnly: mode === 'project',
            // [Fixed] 关键配置：分离数据块大小和视觉网格大小
            chunkSize: 128, // 空间哈希索引大小（保持高性能）
            gridSize: 20,   // 视觉/操作网格大小（所有工具基于此吸附）
        };

        const systems = {
            world: new World(config.chunkSize),
        };

        const engine = new Engine(config, systems);

        if (mode === 'editor') {
            const editorPlugin = new EditorToolsPlugin([
                new HandTool(engine), 
                new BrushTool(engine),
                new EraserTool(engine),
                new RectangleTool(engine),
                new PortalTool(engine),
                new SelectionTool(engine)
            ]);
            
            engine.registerPlugin(editorPlugin);
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

    return (
        <div ref={containerRef} className="relative w-full h-full touch-none outline-none bg-gray-900 overflow-hidden">
            {mode === 'editor' && <BlockInspector />}
        </div>
    );
}