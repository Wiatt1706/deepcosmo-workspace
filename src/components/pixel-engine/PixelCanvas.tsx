// src/components/pixel-engine/PixelCanvas.tsx
"use client";
import React, { useEffect, useRef } from "react";
import { Engine } from "./core/Engine";
import { EditorToolsPlugin } from "./plugins/EditorToolsPlugin";
import { HistoryPlugin } from "./plugins/HistoryPlugin";
import { NestedWorldPlugin } from "./plugins/NestedWorldPlugin";
import { ViewerPlugin } from "./plugins/ViewerPlugin";
import { usePixelEngine } from "./PixelContext";
import { EditorMode } from "@/app/[locale]/(main)/worlds/_lib/modeStore";

interface Props {
    mode: EditorMode;
}

export default function PixelCanvas({ mode }: Props) {
    const containerRef = useRef<HTMLDivElement>(null);
    const { setEngine } = usePixelEngine();
    const engineInstanceRef = useRef<Engine | null>(null);

    // [Safety] 用于标记当前 Effect 是否正在运行初始化，防止 Strict Mode 双重调用
    const isInitializing = useRef(false);

    useEffect(() => {
        if (!containerRef.current || isInitializing.current) return;
        
        // 如果引擎已经存在且模式没变，直接返回
        if (engineInstanceRef.current) return;

        isInitializing.current = true;

        // 1. 初始化引擎配置
        const config = {
            container: containerRef.current,
            backgroundColor: mode === 'editor' ? '#111827' : '#000000',
            readOnly: mode === 'project',
        };

        // 2. 实例化
        const engine = new Engine(config);

        // 3. 注册插件
        if (mode === 'editor') {
            engine.registerPlugin(new EditorToolsPlugin());
            engine.registerPlugin(new HistoryPlugin());
            engine.registerPlugin(new NestedWorldPlugin());
        } else {
            engine.registerPlugin(new ViewerPlugin());
        }

        // 4. 保存引用并更新 Context
        engineInstanceRef.current = engine;
        setEngine(engine); 

        // 5. 初始化结束
        isInitializing.current = false;

        return () => {
            // [Cleanup] 仅在组件真正的卸载时清理
            if (engineInstanceRef.current) {
                engineInstanceRef.current.destroy();
                engineInstanceRef.current = null;
            }
        };
        // [Fix Loop] 依赖数组非常关键：mode 改变时重新初始化；setEngine 必须是 useCallback 过的
    }, [mode, setEngine]);

    return <div ref={containerRef} className="relative w-full h-full touch-none outline-none bg-gray-900 overflow-hidden" />;
}