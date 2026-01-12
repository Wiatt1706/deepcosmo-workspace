// src/components/Sidebar.tsx
import React, { useRef, useState, useEffect } from 'react';
import { ToolType, IEventBus } from './types';

// Tool Button Component
const ToolButton = ({ 
  isActive, 
  onClick, 
  icon, 
  title, 
  colorClass = 'bg-blue-600 text-white shadow-lg' 
}: { 
  isActive: boolean; 
  onClick: () => void; 
  icon: string; 
  title: string;
  colorClass?: string;
}) => (
  <button 
    onClick={onClick} 
    title={title}
    className={`
      p-3 rounded-xl text-xl transition-all duration-200 transform hover:scale-105 active:scale-95
      ${isActive 
        ? `${colorClass} ring-2 ring-offset-2 ring-offset-gray-900 ring-blue-500` 
        : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'}
    `}
  >
    {icon}
  </button>
);

interface SidebarProps {
  events: IEventBus; 
}

export default function Sidebar({ events }: SidebarProps) {
  const [activeTool, setActiveTool] = useState<ToolType>('brush');
  const [fillMode, setFillMode] = useState<'color' | 'image'>('color');
  const [activeColor, setActiveColor] = useState('#3b82f6');
  const [isContinuous, setIsContinuous] = useState(false);
  
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // 订阅所有必要状态
    const onHistoryChange = (u: boolean, r: boolean) => { setCanUndo(u); setCanRedo(r); };
    const onToolSet = (t: ToolType) => setActiveTool(t);
    const onSettingChange = (b: boolean) => setIsContinuous(b);
    
    const onStateChange = (state: any) => {
        if (state.fillMode) setFillMode(state.fillMode);
        if (state.activeColor) setActiveColor(state.activeColor);
    };
    
    events.on('history:state-change', onHistoryChange);
    events.on('tool:set', onToolSet);
    events.on('setting:continuous', onSettingChange);
    events.on('state:change', onStateChange);
    
    return () => {
        events.off('history:state-change', onHistoryChange);
        events.off('tool:set', onToolSet);
        events.off('setting:continuous', onSettingChange);
        events.off('state:change', onStateChange);
    };
  }, [events]);

  const setTool = (t: ToolType) => {
    setActiveTool(t);
    events.emit('tool:set', t);
  };

  const handleColorChange = (c: string) => {
    setActiveColor(c);
    setFillMode('color');
    events.emit('style:set-color', c);
  };

  const toggleContinuous = () => {
      const newVal = !isContinuous;
      setIsContinuous(newVal);
      events.emit('setting:continuous', newVal);
  };

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (ev) => {
            if (ev.target?.result) {
                // 上传图片只改变材质，不强制切工具
                events.emit('style:set-image', ev.target.result as string);
                setFillMode('image');
                
                // UX: 如果当前是漫游，自动切回画笔方便用户操作
                if (activeTool === 'hand') setTool('brush');
            }
        };
        reader.readAsDataURL(file);
    }
    e.target.value = ''; 
  };

  return (
    <div className="absolute left-6 top-1/2 -translate-y-1/2 flex flex-col gap-5 p-4 bg-gray-900/95 backdrop-blur-xl rounded-2xl border border-gray-700/50 shadow-2xl z-20">
       
       {/* 1. Tools Section */}
       <div className="flex flex-col gap-3">
         <ToolButton isActive={activeTool==='hand'} onClick={()=>setTool('hand')} icon="✋" title="Pan (Space)"/>
         
         <div className="relative group">
            <ToolButton isActive={activeTool==='brush'} onClick={()=>setTool('brush')} icon="🖌️" title="Brush"/>
            {/* 连续绘制指示灯 */}
            {activeTool === 'brush' && (
                <div className={`absolute -right-2 -top-2 w-4 h-4 rounded-full border-2 border-gray-900 ${isContinuous ? 'bg-green-500' : 'bg-gray-500'}`} />
            )}
         </div>

         <ToolButton isActive={activeTool==='rectangle'} onClick={()=>setTool('rectangle')} icon="⬜" title="Rectangle"/>
         <ToolButton isActive={activeTool==='portal'} onClick={()=>setTool('portal')} icon="🚪" title="Portal" colorClass="bg-purple-600 text-white"/>
         <ToolButton isActive={activeTool==='eraser'} onClick={()=>setTool('eraser')} icon="🧹" title="Eraser" colorClass="bg-red-600 text-white"/>
       </div>

       <div className="h-px bg-gray-700/50 w-full" />

       {/* 2. Material Section */}
       <div className="flex flex-col items-center gap-3">
            <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Material</span>
            
            {/* Color Picker */}
            <div className={`relative p-1 rounded-full transition-all ${fillMode === 'color' ? 'bg-blue-500 scale-110' : 'bg-transparent'}`}>
                <input 
                    type="color" 
                    value={activeColor} 
                    onChange={e => handleColorChange(e.target.value)} 
                    className="w-8 h-8 rounded-full cursor-pointer border border-gray-500 bg-transparent p-0"
                    title="Fill Color"
                />
            </div>

            {/* Image Picker */}
            <button 
                onClick={() => fileInputRef.current?.click()}
                className={`p-2 rounded-lg text-lg transition-all ${fillMode === 'image' ? 'bg-green-600 text-white shadow scale-110' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
                title="Use Image Texture"
            >
                🖼️
            </button>
            <input ref={fileInputRef} type="file" hidden accept="image/*" onChange={handleUpload}/>
       </div>

       <div className="h-px bg-gray-700/50 w-full" />

       {/* 3. Settings */}
       <div className="flex flex-col items-center gap-2">
            <button 
                onClick={toggleContinuous}
                className={`text-[10px] font-bold px-2 py-1 rounded border transition-colors ${isContinuous ? 'bg-green-900/50 text-green-400 border-green-700' : 'bg-gray-800 text-gray-500 border-transparent hover:border-gray-600'}`}
                title="Toggle Continuous Drawing"
            >
                {isContinuous ? "CONT: ON" : "CONT: OFF"}
            </button>
       </div>

       <div className="h-px bg-gray-700/50 w-full" />

       {/* 4. History */}
       <div className="flex gap-3 justify-center">
        <button onClick={() => events.emit('history:undo')} disabled={!canUndo} className={`p-2 rounded-lg transition-colors ${!canUndo ? 'text-gray-600' : 'text-white hover:bg-gray-700'}`} title="Undo (Ctrl+Z)">↩️</button>
        <button onClick={() => events.emit('history:redo')} disabled={!canRedo} className={`p-2 rounded-lg transition-colors ${!canRedo ? 'text-gray-600' : 'text-white hover:bg-gray-700'}`} title="Redo (Ctrl+Y)">↪️</button>
       </div>
    </div>
  );
}