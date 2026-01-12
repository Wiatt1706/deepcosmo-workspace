// src/app/editor/_components/header-tool.tsx
"use client";
import React, { useState, useEffect, useRef } from "react";
import { Settings } from "lucide-react";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { usePixelEngine } from "@/components/pixel-engine/PixelContext";

const WorldStorage = {
  save: (id: string, data: string) => {
    if (typeof window !== 'undefined') localStorage.setItem(`pixel_world_${id}`, data);
  },
  load: (id: string) => {
    if (typeof window !== 'undefined') return localStorage.getItem(`pixel_world_${id}`);
    return null;
  },
};

export default function HeaderTool() {
  const { engine, events } = usePixelEngine();
  // [Fix Hydration] 初始值必须是服务器和客户端一致的，不要在这里直接读 localStorage
  const [worldPath, setWorldPath] = useState([{ id: 'root', name: 'Main World' }]);

  // 使用 Ref 来打破闭包陷阱，用于在事件回调中获取最新路径（如果需要保存逻辑）
  const worldPathRef = useRef(worldPath);
  useEffect(() => { worldPathRef.current = worldPath; }, [worldPath]);

  useEffect(() => {
    if (!events || !engine) return;

    const onEnterWorld = (targetId: string, targetName: string) => {
       // 通过 Ref 获取当前状态，避免将 worldPath 加入依赖数组
       const currentPath = worldPathRef.current;
       const currentId = currentPath[currentPath.length - 1].id;
       
       const currentData = engine.world.toJSON();
       if (currentData) WorldStorage.save(currentId, currentData);

       // [Fix Loop] 使用函数式更新，不依赖外部变量
       setWorldPath(prev => [...prev, { id: targetId, name: targetName }]);
       
       // 加载逻辑 (放到 setTimeout 确保 React 状态更新不阻塞 UI)
       setTimeout(() => loadWorldData(engine, targetId), 0);
    };

    events.on('world:request-enter', onEnterWorld);
    return () => events.off('world:request-enter', onEnterWorld);
    
    // [Fix] 依赖数组只包含 events 和 engine，不包含 worldPath
  }, [events, engine]);

  const loadWorldData = (eng: any, id: string) => {
    const data = WorldStorage.load(id);
    if (data) eng.world.fromJSON(data);
    else eng.world.clear();
    eng.renderer.clear();
  };

  const navigateTo = (index: number) => {
    if (!engine) return;
    const currentPath = worldPath; // 点击事件中可以直接读取 state
    
    if (index === currentPath.length - 1) return;
    
    const currentId = currentPath[currentPath.length - 1].id;
    const currentData = engine.world.toJSON();
    if (currentData) WorldStorage.save(currentId, currentData);

    const targetItem = currentPath[index];
    setWorldPath(prev => prev.slice(0, index + 1));
    loadWorldData(engine, targetItem.id);
  };

  return (
    <header className="bg-background sticky top-0 flex shrink-0 items-center gap-2 border-b h-12 px-4 z-10">
      <div className="flex items-center flex-1">
        <Breadcrumb>
          <BreadcrumbList>
            {worldPath.map((item, index) => (
                <React.Fragment key={item.id}>
                    {index > 0 && <BreadcrumbSeparator />}
                    <BreadcrumbItem>
                        <BreadcrumbLink 
                            onClick={() => navigateTo(index)}
                            className={`cursor-pointer ${index === worldPath.length-1 ? 'text-foreground font-medium cursor-default' : ''}`}
                        >
                            {item.name}
                        </BreadcrumbLink>
                    </BreadcrumbItem>
                </React.Fragment>
            ))}
          </BreadcrumbList>
        </Breadcrumb>
      </div>
      <Button variant="secondary" size="icon" className="size-8">
        <Settings className="h-4 w-4" />
      </Button>
    </header>
  );
}