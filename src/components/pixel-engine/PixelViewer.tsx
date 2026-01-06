"use client"
import { useEffect, useRef, useState } from 'react';
import Breadcrumbs from './Breadcrumbs';
import ViewerOverlay from './ViewerOverlay';
import { Engine } from './core/Engine';
import { ViewerPlugin } from './plugins/ViewerPlugin';

// --- MOCK DATA FOR DEMO ---
const MOCK_DATA: Record<string, any> = {
  'root': [
    { id: 'b1', x: -100, y: -50, w: 200, h: 100, color: '#1e40af', type: 'basic' }, // 大蓝块
    // 这是一个传送门，id: portal1 -> world_2
    { id: 'portal1', x: 50, y: 50, w: 40, h: 40, color: '#a855f7', type: 'nested', targetWorldId: 'world_2', worldName: 'Cyber City' }
  ],
  'world_2': [
    // 子世界：包含一些分散的方块
    { id: 'w2_center', x: -50, y: -50, w: 100, h: 100, color: '#059669', type: 'basic' }, // 中心绿块
    { id: 'w2_p2', x: 200, y: 0, w: 50, h: 50, color: '#db2777', type: 'nested', targetWorldId: 'world_3', worldName: 'Deep Core' }
  ],
  'world_3': [
    { id: 'w3_core', x: 0, y: 0, w: 500, h: 500, color: '#b91c1c', type: 'basic' } // 巨大的红块
  ]
};

// 模拟 API
const MockStorage = {
  load: (id: string) => {
    // 优先加载本地存储，没有则用 mock
    const local = localStorage.getItem(`pixel_world_${id}`);
    if (local) return local;
    return JSON.stringify(MOCK_DATA[id] || []);
  }
};

export default function PixelViewer() {
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<Engine | null>(null);
  const [isReady, setIsReady] = useState(false);
  
  const [worldPath, setWorldPath] = useState([{ id: 'root', name: 'Main World' }]);

  useEffect(() => {
    if (!containerRef.current) return;

    const engine = new Engine({ 
      container: containerRef.current,
      backgroundColor: '#000000', // 纯黑背景适合沉浸式体验
      readOnly: true, 
    });

    engine.registerPlugin(new ViewerPlugin());
    engineRef.current = engine;

    // 监听进入请求 (包含 callback)
    engine.events.on('world:request-enter', (targetId, targetName, callback) => {
        enterWorld(targetId, targetName, callback);
    });

    loadWorldData('root');
    setIsReady(true);

    return () => engine.destroy();
  }, []);

  const enterWorld = (targetId: string, targetName: string, callback?: () => void) => {
    const currentId = worldPath[worldPath.length - 1].id;
    if (currentId === targetId) return;

    // 1. 更新面包屑 UI
    setWorldPath(prev => [...prev, { id: targetId, name: targetName }]);
    
    // 2. 加载新世界数据
    // 在 React 中，State 更新可能是异步的，但 Engine 的操作是同步的。
    // 我们在这里同步加载数据
    loadWorldData(targetId);

    // 3. 执行引擎的回调 (修正摄像机位置)
    // 使用 requestAnimationFrame 确保数据已经准备好被渲染
    if (callback) {
        requestAnimationFrame(() => {
            callback();
            // 强制重绘一帧以确保视觉连续
            engineRef.current?.renderer.drawWorld();
        });
    } else {
        // 如果是通过面包屑导航进入的（没有 callback），重置摄像机到原点
        engineRef.current?.camera.teleport(0, 0, 1);
    }
  };

  const navigateTo = (index: number) => {
    if (index === worldPath.length - 1) return; 
    const targetItem = worldPath[index];
    setWorldPath(prev => prev.slice(0, index + 1));
    loadWorldData(targetItem.id);
    engineRef.current?.camera.teleport(0, 0, 1);
  };

  const loadWorldData = (id: string) => {
    if (!engineRef.current) return;
    
    const json = MockStorage.load(id);
    if (json) {
        engineRef.current.world.fromJSON(json);
    } else {
        engineRef.current.world.clear();
    }
    // 数据加载后，Renderer 会在下一帧 loop 中绘制，
    // 但为了逻辑安全，可以手动 clear 一下
    engineRef.current.renderer.clear();
  };

  return (
    <div className="relative w-full h-full bg-black overflow-hidden select-none">
      <div ref={containerRef} className="w-full h-full" />
      
      <Breadcrumbs path={worldPath} onNavigate={navigateTo} />

      {isReady && engineRef.current && (
        <ViewerOverlay events={engineRef.current.events} />
      )}
      
      <div className="absolute bottom-4 left-4 text-gray-500 text-xs pointer-events-none">
        Debug: Click to Select / Scroll to Zoom In
      </div>
    </div>
  );
}