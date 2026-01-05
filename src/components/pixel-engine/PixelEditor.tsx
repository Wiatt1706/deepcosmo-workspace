"use client"
import { useEffect, useRef, useState } from 'react';

import Sidebar from './Sidebar';
import Breadcrumbs from './Breadcrumbs';
import { Engine } from './core/Engine';
import { EditorToolsPlugin } from './plugins/EditorToolsPlugin';
import { HistoryPlugin } from './plugins/HistoryPlugin';
import { NestedWorldPlugin } from './plugins/NestedWorldPlugin';
// 模拟简单的世界存储
const WorldStorage = {
  save: (id: string, data: string) => localStorage.setItem(`pixel_world_${id}`, data),
  load: (id: string) => localStorage.getItem(`pixel_world_${id}`),
};

export default function PixelEditor() {
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<Engine | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [worldPath, setWorldPath] = useState([{ id: 'root', name: 'Main World' }]);

  useEffect(() => {
    if (!containerRef.current) return;

    const engine = new Engine({ 
      container: containerRef.current,
      backgroundColor: '#111827'
    });

    engine.registerPlugin(new EditorToolsPlugin());
    engine.registerPlugin(new HistoryPlugin());
    engine.registerPlugin(new NestedWorldPlugin());

    engineRef.current = engine;

    // 监听进入世界请求
    engine.events.on('world:request-enter', (targetId: string, targetName: string) => {
        enterWorld(targetId, targetName);
    });

    // 初始加载
    loadWorldData('root');
    setIsReady(true);

    return () => engine.destroy();
  }, []); // eslint-disable-line

  const enterWorld = (targetId: string, targetName: string) => {
    const currentId = worldPath[worldPath.length - 1].id;
    const currentData = engineRef.current?.world.toJSON();
    if (currentData) WorldStorage.save(currentId, currentData);

    setWorldPath(prev => [...prev, { id: targetId, name: targetName }]);
    loadWorldData(targetId);
  };

  const navigateTo = (index: number) => {
    if (index === worldPath.length - 1) return; 

    const currentId = worldPath[worldPath.length - 1].id;
    const currentData = engineRef.current?.world.toJSON();
    if (currentData) WorldStorage.save(currentId, currentData);

    const targetItem = worldPath[index];
    setWorldPath(prev => prev.slice(0, index + 1));
    loadWorldData(targetItem.id);
  };

  const loadWorldData = (id: string) => {
    if (!engineRef.current) return;
    const data = WorldStorage.load(id);
    if (data) {
        engineRef.current.world.fromJSON(data);
    } else {
        engineRef.current.world.clear();
    }
    // 简单的重绘触发
    engineRef.current.renderer.clear();
  };

  const handleSave = () => {
      const currentId = worldPath[worldPath.length - 1].id;
      const data = engineRef.current?.world.toJSON();
      if (data) {
          WorldStorage.save(currentId, data);
          alert(`Saved world: ${currentId}`);
      }
  };

  return (
    <div className="relative w-full h-full bg-gray-900 overflow-hidden">
      <div ref={containerRef} className="w-full h-full" />
      
      <Breadcrumbs path={worldPath} onNavigate={navigateTo} />

      {isReady && engineRef.current && (
        <Sidebar events={engineRef.current.events} />
      )}

      <div className="absolute top-4 right-4 z-10">
         <button onClick={handleSave} className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-white font-bold shadow-lg">
            Save
         </button>
      </div>
    </div>
  );
}