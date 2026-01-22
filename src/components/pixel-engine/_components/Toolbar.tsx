"use client";
import React, { useRef, useState, useEffect } from 'react';
import { usePixelEngine } from '@/components/pixel-engine/PixelContext';
import { ToolType } from '@/components/pixel-engine/types'; // 确保这里包含 'rectangle-select'
import { cn } from '@/lib/utils';
import { 
  MousePointer2, 
  Brush, 
  Eraser, 
  Square, 
  DoorOpen, 
  Image as ImageIcon, 
  Undo, 
  Redo,
  Infinity as InfinityIcon,
  Minus,
  Plus,
  RotateCcw,
  Loader2,
  // [New] 引入新图标
  BoxSelect,     // 选区图标
  Copy,          // 复制
  ClipboardPaste // 粘贴
} from 'lucide-react';

// --- 子组件定义 (保持不变) ---
const Section = ({ title, children }: { title: string, children: React.ReactNode }) => (
  <div className="flex flex-col gap-3 mb-4">
    <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider pl-1 select-none">{title}</h3>
    {children}
  </div>
);

const ToolButton = ({ active, icon: Icon, onClick, className, label, disabled }: any) => (
  <button
    onClick={onClick}
    disabled={disabled}
    title={label}
    className={cn(
      "flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl transition-all duration-200 border relative group",
      disabled && "opacity-50 cursor-not-allowed",
      active 
        ? "bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-900/20" 
        : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300 hover:-translate-y-0.5",
      className
    )}
  >
    <Icon size={20} strokeWidth={active ? 2.5 : 2} className={cn(label === "Uploading" && "animate-spin")} />
    <span className="text-[10px] font-medium">{label}</span>
  </button>
);

const IconButton = ({ icon: Icon, onClick, disabled }: any) => (
  <button 
    onClick={onClick}
    disabled={disabled}
    className="p-1.5 text-gray-500 hover:text-black hover:bg-white rounded-md transition-all active:scale-95 disabled:opacity-30"
  >
    <Icon size={16} />
  </button>
);

const ToggleRow = ({ label, active, onClick, icon: Icon }: any) => (
  <button
    onClick={onClick}
    className={cn(
      "w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all border",
      active 
        ? "bg-blue-50 text-blue-700 border-blue-200" 
        : "bg-white text-gray-600 border-transparent hover:bg-gray-50"
    )}
  >
    <div className="flex items-center gap-2">
      <Icon size={14} className={active ? "text-blue-600" : "text-gray-400"} />
      {label}
    </div>
    <div className={cn(
      "w-8 h-4 rounded-full relative transition-colors duration-200",
      active ? "bg-blue-500" : "bg-gray-300"
    )}>
      <div className={cn(
        "absolute top-0.5 w-3 h-3 bg-white rounded-full shadow-sm transition-transform duration-200",
        active ? "left-4.5 translate-x-0" : "left-0.5"
      )} style={{ left: active ? 'calc(100% - 14px)' : '2px' }} />
    </div>
  </button>
);

// --- 主组件 (Main Component) ---

export function EditorToolbar() {
  const { events, engine, isReady } = usePixelEngine();
  
  // State
  const [activeTool, setActiveTool] = useState<ToolType>('brush');
  const [fillMode, setFillMode] = useState<'color' | 'image'>('color');
  const [activeColor, setActiveColor] = useState('#3b82f6');
  const [isContinuous, setIsContinuous] = useState(false);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  
  // [New] 选区相关状态
  const [hasSelection, setHasSelection] = useState(false);
  
  const [mounted, setMounted] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setMounted(true); }, []);

  // Event Listeners
  useEffect(() => {
    if (!events || !engine) return;

    const onHistoryChange = (u: boolean, r: boolean) => { setCanUndo(u); setCanRedo(r); };
    const onToolSet = (t: ToolType) => setActiveTool(t);
    const onSettingChange = (b: boolean) => setIsContinuous(b);
    const onStateChange = (state: any) => {
        if (state.fillMode) setFillMode(state.fillMode);
        if (state.activeColor) setActiveColor(state.activeColor);
    };
    const onAssetLoaded = () => setIsUploading(false);

    // [New] 监听选区变化，控制“复制”按钮的可用性
    const onSelectionChange = (rect: any) => {
        setHasSelection(!!rect);
    };

    events.on('history:state-change', onHistoryChange);
    events.on('tool:set', onToolSet);
    events.on('setting:continuous', onSettingChange);
    events.on('state:change', onStateChange);
    events.on('asset:loaded', onAssetLoaded);
    events.on('selection:change', onSelectionChange); // [New]

    // Initial Sync
    setActiveTool(engine.state.currentTool);
    setActiveColor(engine.state.activeColor);
    setFillMode(engine.state.fillMode);
    setIsContinuous(engine.state.isContinuous);
    setHasSelection(engine.selection.hasSelection); // [New]

    return () => {
        events.off('history:state-change', onHistoryChange);
        events.off('tool:set', onToolSet);
        events.off('setting:continuous', onSettingChange);
        events.off('state:change', onStateChange);
        events.off('asset:loaded', onAssetLoaded);
        events.off('selection:change', onSelectionChange); // [New]
    };
  }, [events, engine]);

  // Actions
  const setTool = (t: ToolType) => events?.emit('tool:set', t);
  const handleColorChange = (c: string) => events?.emit('style:set-color', c);
  const toggleContinuous = () => events?.emit('setting:continuous', !isContinuous);
  
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !engine || !events) return;
      setIsUploading(true);
      try {
          const url = await engine.assets.uploadAsset(file);
          const imageState = { url: url, isUploading: false, originalFile: file };
          events.emit('style:set-image', imageState);
      } catch (error) {
          console.error("Upload failed:", error);
      } finally {
          setIsUploading(false);
          if (fileInputRef.current) fileInputRef.current.value = '';
      }
  };

  const handleZoom = (delta: number) => {
    if (!engine) return;
    const center = { x: engine.canvas.width / 2, y: engine.canvas.height / 2 };
    const factor = delta > 0 ? 1.2 : 0.8;
    engine.camera.zoomBy(factor, center.x, center.y);
    engine.requestRender(); 
  };
  
  const handleResetView = () => {
      if (engine) {
          engine.camera.teleport(0, 0, 1);
          engine.requestRender();
      }
  };

  // [New] 剪贴板操作
  const handleCopy = () => {
    engine?.selection.copy();
  };

  const handlePaste = () => {
    if (engine) {
        // UI 按钮点击粘贴时，默认粘贴在当前相机视野中心
        // 因为用户没有用鼠标指定位置
        const centerWorld = engine.camera.screenToWorld(
            engine.canvas.width / 2, 
            engine.canvas.height / 2
        );
        engine.selection.paste(centerWorld);
    }
  };

  const handleUndo = () => events?.emit('history:undo');
  const handleRedo = () => events?.emit('history:redo');

  if (!mounted || !isReady) {
    return <div className="flex items-center justify-center h-full"><Loader2 className="animate-spin text-gray-400"/></div>;
  }

  return (
    <div className="flex flex-col w-full h-full p-4 overflow-y-auto bg-gray-50/50">
      
      {/* --- Section 1: Tools --- */}
      <Section title="Tools">
        <div className="grid grid-cols-2 gap-2">
          {/* Hand / Pan */}
          <ToolButton 
            active={activeTool === 'hand'} 
            onClick={() => setTool('hand')} 
            icon={MousePointer2} 
            label="Pan"
          />
          
          {/* [New] Select Tool */}
          <ToolButton 
            active={activeTool === 'rectangle-select'} 
            onClick={() => setTool('rectangle-select')} 
            icon={BoxSelect} 
            label="Select"
            className={activeTool === 'rectangle-select' ? "!bg-indigo-600 !border-indigo-600" : ""}
          />

          {/* Brush */}
          <ToolButton 
            active={activeTool === 'brush'} 
            onClick={() => setTool('brush')} 
            icon={Brush} 
            label="Brush"
          />

          {/* Rectangle */}
          <ToolButton 
            active={activeTool === 'rectangle'} 
            onClick={() => setTool('rectangle')} 
            icon={Square} 
            label="Rect"
          />

           {/* Eraser */}
           <ToolButton 
            active={activeTool === 'eraser'} 
            onClick={() => setTool('eraser')} 
            icon={Eraser} 
            label="Eraser"
            className={activeTool === 'eraser' ? "!bg-red-500 !border-red-500" : ""}
          />

          {/* Portal */}
          <ToolButton 
            active={activeTool === 'portal'} 
            onClick={() => setTool('portal')} 
            icon={DoorOpen} 
            label="Portal"
            className={activeTool === 'portal' ? "!bg-purple-600 !border-purple-600" : ""}
          />

          {/* Image Upload */}
          <ToolButton 
            active={fillMode === 'image'} 
            onClick={() => fileInputRef.current?.click()} 
            icon={isUploading ? Loader2 : ImageIcon} 
            label={isUploading ? "Uploading" : "Image"}
            disabled={isUploading}
            className={fillMode === 'image' ? "!bg-green-600 !border-green-600 !text-white col-span-2" : "col-span-2"}
          />
          <input 
            ref={fileInputRef} 
            type="file" 
            hidden 
            accept="image/*" 
            onChange={handleImageUpload} 
          /> 
        </div>
      </Section>

      {/* --- Section 2: Properties --- */}
      <Section title="Properties">
        <div className="space-y-3 bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between group cursor-pointer">
                <span className="text-xs text-gray-500 font-medium">Color</span>
                <div className="relative">
                    <input 
                        type="color" 
                        value={activeColor}
                        onChange={(e) => handleColorChange(e.target.value)}
                        className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                    />
                    <div 
                        className="w-6 h-6 rounded-full border border-gray-200 shadow-sm ring-2 ring-transparent group-hover:ring-blue-500/20 transition-all"
                        style={{ backgroundColor: activeColor }}
                    />
                </div>
            </div>

            <ToggleRow 
                label="Continuous" 
                active={isContinuous} 
                onClick={toggleContinuous} 
                icon={InfinityIcon}
            />
        </div>
      </Section>

      {/* --- Section 3: Actions (Clipboard & History) --- */}
      <Section title="Actions">
         
         {/* [New] Clipboard Actions */}
         <div className="grid grid-cols-2 gap-2 mb-2">
            <button
                onClick={handleCopy}
                disabled={!hasSelection}
                className="flex items-center justify-center gap-2 p-2 rounded-lg bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
            >
                <Copy size={14} />
                <span className="text-xs font-medium">Copy</span>
            </button>
            <button
                onClick={handlePaste}
                className="flex items-center justify-center gap-2 p-2 rounded-lg bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 transition-all active:scale-95"
            >
                <ClipboardPaste size={14} />
                <span className="text-xs font-medium">Paste</span>
            </button>
         </div>

         {/* Undo / Redo */}
         <div className="grid grid-cols-2 gap-2 mb-4">
            <button
                onClick={handleUndo}
                disabled={!canUndo}
                className="flex items-center justify-center gap-2 p-2 rounded-lg bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
            >
                <Undo size={14} />
                <span className="text-xs font-medium">Undo</span>
            </button>
            <button
                onClick={handleRedo}
                disabled={!canRedo}
                className="flex items-center justify-center gap-2 p-2 rounded-lg bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
            >
                <Redo size={14} />
                <span className="text-xs font-medium">Redo</span>
            </button>
         </div>

         {/* View Controls */}
         <div className="flex items-center justify-between bg-white rounded-lg p-1 mb-2 border border-gray-200 shadow-sm">
            <IconButton icon={Minus} onClick={() => handleZoom(-1)} />
            <span className="text-[10px] font-mono font-medium text-gray-400 select-none">ZOOM</span>
            <IconButton icon={Plus} onClick={() => handleZoom(1)} />
         </div>

         <button 
           onClick={handleResetView}
           className="w-full flex items-center justify-center gap-2 py-2 text-xs font-medium text-gray-500 hover:text-gray-900 hover:bg-white rounded-lg transition-colors border border-transparent hover:border-gray-200"
         >
           <RotateCcw size={12} />
           Reset View
         </button>
      </Section>
    </div>
  );
}