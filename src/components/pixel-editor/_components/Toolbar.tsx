// components/EditorToolbar.tsx
import React from 'react';
import { 
  MousePointer2, 
  Hand, 
  Pencil, 
  Minus, 
  Plus, 
  Grid3X3, 
  Magnet, 
  Ruler, 
  RotateCcw,
  Eraser,
  Type
} from 'lucide-react';
import { useEditorStore } from '../hook/pixelEditorStore'; // 假设路径
import { cn } from '@/lib/utils'; // 假设你有类似 shadcn 的 class合并工具

export const EditorToolbar = () => {
  // 从 Store 提取需要的状态和动作
  const {
    interactionMode, setInteractionMode,
    brushSize, setBrushSize,
    currentColor, setCurrentColor,
    scale, setScale, resetView,
    showGrid, setShowGrid,
    snapToGrid, setSnapToGrid,
    showRuler, setShowRuler
  } = useEditorStore();

  // 辅助函数：处理缩放
  const handleZoom = (delta: number) => {
    const newScale = Math.max(0.1, Math.min(10, scale + delta));
    setScale(newScale);
  };

  return (
    <div className="flex flex-col gap-6 w-full p-4 text-sm select-none">
      
      {/* --- 第一部分：核心工具 --- */}
      <Section title="Tools">
        <div className="grid grid-cols-2 gap-2">
          <ToolButton 
            active={interactionMode === 'select'} 
            onClick={() => setInteractionMode('select')}
            icon={MousePointer2}
            label="Select"
          />
          <ToolButton 
            active={interactionMode === 'pan'} 
            onClick={() => setInteractionMode('pan')}
            icon={Hand}
            label="Pan"
          />
          <ToolButton 
            active={interactionMode === 'draw'} 
            onClick={() => setInteractionMode('draw')}
            icon={Pencil}
            label="Draw"
            className="col-span-2" // 让绘画按钮占据整行，突显重要性
          />
        </div>
      </Section>

      {/* --- 第二部分：笔刷属性 (仅在绘制模式显示，或始终显示但置灰) --- */}
      <Section title="Brush">
        <div className={cn("space-y-4 transition-opacity", interactionMode !== 'draw' && "opacity-50 pointer-events-none")}>
          
          {/* 颜色选择器 */}
          <div className="flex items-center justify-between group cursor-pointer">
            <span className="text-gray-500 font-medium">Color</span>
            <div className="relative">
              <input 
                type="color" 
                value={currentColor}
                onChange={(e) => setCurrentColor(e.target.value)}
                className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
              />
              <div 
                className="w-8 h-8 rounded-full border border-gray-200 shadow-sm ring-2 ring-transparent group-hover:ring-blue-500/20 transition-all"
                style={{ backgroundColor: currentColor }}
              />
            </div>
          </div>

          {/* 笔刷尺寸 - 快速预设 */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-gray-400">
              <span>Size: {brushSize.width}×{brushSize.height}</span>
            </div>
            <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
               {[1, 2, 4, 8].map(size => (
                 <button
                   key={size}
                   onClick={() => setBrushSize(size, size)}
                   className={cn(
                     "flex-1 py-1.5 text-xs font-medium rounded-md transition-all",
                     brushSize.width === size 
                       ? "bg-white text-black shadow-sm" 
                       : "text-gray-500 hover:text-gray-900"
                   )}
                 >
                   {size}px
                 </button>
               ))}
            </div>
            {/* 也可以加入 Slider 用于微调，这里暂略保持简洁 */}
          </div>
        </div>
      </Section>

      {/* --- 第三部分：画布视图 --- */}
      <Section title="Canvas">
        {/* 缩放控制 */}
        <div className="flex items-center justify-between bg-gray-50 rounded-lg p-1 mb-3 border border-gray-100">
          <IconButton icon={Minus} onClick={() => handleZoom(-0.1)} />
          <span className="text-xs font-mono font-medium text-gray-600 w-12 text-center">
            {Math.round(scale * 100)}%
          </span>
          <IconButton icon={Plus} onClick={() => handleZoom(0.1)} />
        </div>

        {/* 开关组 */}
        <div className="space-y-1">
          <ToggleRow 
            label="Grid" 
            active={showGrid} 
            onClick={() => setShowGrid(!showGrid)} 
            icon={Grid3X3}
          />
          <ToggleRow 
            label="Snap" 
            active={snapToGrid} 
            onClick={() => setSnapToGrid(!snapToGrid)} 
            icon={Magnet}
          />
          <ToggleRow 
            label="Ruler" 
            active={showRuler} 
            onClick={() => setShowRuler(!showRuler)} 
            icon={Ruler}
          />
        </div>

        <button 
          onClick={resetView}
          className="mt-4 w-full flex items-center justify-center gap-2 py-2 text-xs font-medium text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <RotateCcw size={14} />
          Reset View
        </button>
      </Section>

    </div>
  );
};

// --- 子组件 (为了保持代码整洁) ---

const Section = ({ title, children }: { title: string, children: React.ReactNode }) => (
  <div className="flex flex-col gap-3">
    <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider pl-1">{title}</h3>
    {children}
  </div>
);

const ToolButton = ({ active, icon: Icon, onClick, className, label }: any) => (
  <button
    onClick={onClick}
    className={cn(
      "flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl transition-all duration-200 border",
      active 
        ? "bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-900/20" 
        : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300",
      className
    )}
  >
    <Icon size={20} strokeWidth={active ? 2.5 : 2} />
    <span className="text-[10px] font-medium">{label}</span>
  </button>
);

const IconButton = ({ icon: Icon, onClick }: any) => (
  <button 
    onClick={onClick}
    className="p-1.5 text-gray-500 hover:text-black hover:bg-white rounded-md transition-all active:scale-95"
  >
    <Icon size={16} />
  </button>
);

const ToggleRow = ({ label, active, onClick, icon: Icon }: any) => (
  <button
    onClick={onClick}
    className={cn(
      "w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all",
      active 
        ? "bg-blue-50 text-blue-700" 
        : "text-gray-600 hover:bg-gray-100"
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