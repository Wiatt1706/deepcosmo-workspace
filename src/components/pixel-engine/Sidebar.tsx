import React, { useRef, useState, useEffect } from 'react';
import { ToolType, IEventBus } from './types';

interface SidebarProps {
  events: IEventBus; 
}

export default function Sidebar({ events }: SidebarProps) {
  const [activeTool, setActiveTool] = useState<ToolType>('brush');
  const [color, setColor] = useState('#3b82f6');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  useEffect(() => {
    const onHistoryChange = (undoable: boolean, redoable: boolean) => {
        setCanUndo(undoable);
        setCanRedo(redoable);
    };
    const onToolSet = (t: ToolType) => setActiveTool(t);
    
    events.on('history:state-change', onHistoryChange);
    events.on('tool:set', onToolSet);
    
    return () => {
        events.off('history:state-change', onHistoryChange);
        events.off('tool:set', onToolSet);
    };
  }, [events]);

  const setTool = (t: ToolType) => {
    setActiveTool(t);
    events.emit('tool:set', t);
  };

  const updateColor = (c: string) => {
    setColor(c);
    events.emit('color:set', c);
    setTool('brush');
  };

  const handleUploadClick = () => { fileInputRef.current?.click(); };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
        const base64 = ev.target?.result as string;
        if (base64) {
            events.emit('image:set', base64);
            setTool('image_stamp');
        }
    };
    reader.readAsDataURL(file);
    e.target.value = ''; 
  };

  const btnClass = (isActive: boolean) => 
    `p-3 rounded-lg text-xl transition-colors ${isActive ? 'bg-blue-600 text-white shadow-lg' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`;
  
  const actionBtnClass = (disabled: boolean) => 
    `p-2 rounded-lg text-sm font-bold transition-colors ${disabled ? 'bg-gray-800 text-gray-600 cursor-not-allowed' : 'bg-gray-700 hover:bg-gray-600 text-white'}`;

  return (
    <div className="absolute left-4 top-1/2 -translate-y-1/2 flex flex-col gap-4 p-3 bg-gray-900/90 backdrop-blur-md rounded-2xl border border-gray-700 shadow-2xl z-10">
       <div className="flex flex-col gap-2 bg-gray-800/50 p-2 rounded-xl">
         <button onClick={() => setTool('hand')} className={btnClass(activeTool==='hand')} title="Pan (Space)">✋</button>
         <button onClick={() => setTool('brush')} className={btnClass(activeTool==='brush')} title="Brush">🖌️</button>
         <button onClick={() => setTool('rectangle')} className={btnClass(activeTool==='rectangle')} title="Rectangle">⬜</button>
         {/* [New] Portal Tool */}
         <button onClick={() => setTool('portal')} className={btnClass(activeTool==='portal')} title="Create Portal (Nested World)">🔮</button>
         <button onClick={() => setTool('eraser')} className={`p-3 rounded-lg text-xl transition-colors ${activeTool==='eraser' ? 'bg-red-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`} title="Eraser">🧹</button>
       </div>

       <div className="h-px bg-gray-700 w-full"></div>

       <div className="flex flex-col gap-2 bg-gray-800/50 p-2 rounded-xl">
         <button onClick={handleUploadClick} className={btnClass(activeTool==='image_stamp')} title="Upload Image">🖼️</button>
         <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
       </div>

       <div className="h-px bg-gray-700 w-full"></div>
       
       <div className="p-2 bg-gray-800/50 rounded-xl flex justify-center">
        <input type="color" value={color} onChange={e => updateColor(e.target.value)} className="w-10 h-10 rounded-full cursor-pointer border-2 border-gray-600 bg-transparent p-0"/>
       </div>

       <div className="h-px bg-gray-700 w-full"></div>

       <div className="flex gap-2 justify-center p-2 bg-gray-800/50 rounded-xl">
        <button onClick={() => events.emit('history:undo')} disabled={!canUndo} className={actionBtnClass(!canUndo)} title="Undo">↩️</button>
        <button onClick={() => events.emit('history:redo')} disabled={!canRedo} className={actionBtnClass(!canRedo)} title="Redo">↪️</button>
       </div>
    </div>
  );
}