import React, { useEffect, useState } from 'react';
import { PixelBlock, IEventBus } from './types';

interface Props {
  events: IEventBus;
}

export default function ViewerOverlay({ events }: Props) {
  const [selectedBlock, setSelectedBlock] = useState<PixelBlock | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const onSelect = (block: PixelBlock | null) => {
        if (block) {
            setSelectedBlock(block);
            setIsVisible(true);
        } else {
            setIsVisible(false);
            // 延迟清空，等待动画结束
            setTimeout(() => setSelectedBlock(null), 300);
        }
    };

    events.on('viewer:block-selected', onSelect);
    return () => events.off('viewer:block-selected', onSelect);
  }, [events]);

  // 当不可见时返回 null，或者渲染一个隐藏的 div 也可以
  // 这里为了保持 DOM 干净，不可见且无数据时完全卸载
  if (!selectedBlock && !isVisible) return null;

  return (
    <div 
      className={`absolute top-4 right-4 w-80 bg-gray-900/95 backdrop-blur-md border border-gray-700 p-6 rounded-xl shadow-2xl text-white transform transition-all duration-300 ease-out z-50 ${
        isVisible ? 'translate-x-0 opacity-100' : 'translate-x-10 opacity-0 pointer-events-none'
      }`}
    >
      <div className="flex justify-between items-start mb-4">
        <h2 className="text-xl font-bold text-blue-400">Details</h2>
        <button 
            onClick={() => setIsVisible(false)} 
            className="text-gray-400 hover:text-white transition-colors"
        >
            ✕
        </button>
      </div>

      <div className="space-y-4">
        {/* 图片/颜色展示 */}
        <div className="w-full h-40 rounded-lg bg-gray-800 flex items-center justify-center overflow-hidden border border-gray-600">
           {selectedBlock?.imageUrl ? (
               <img src={selectedBlock.imageUrl} className="w-full h-full object-cover" />
           ) : (
               <div className="w-full h-full" style={{ backgroundColor: selectedBlock?.color }}></div>
           )}
        </div>

        {/* 信息 */}
        <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
                <span className="text-gray-500 font-bold text-xs uppercase">X</span>
                <p className="font-mono">{Math.round(selectedBlock?.x || 0)}</p>
            </div>
            <div>
                <span className="text-gray-500 font-bold text-xs uppercase">Y</span>
                <p className="font-mono">{Math.round(selectedBlock?.y || 0)}</p>
            </div>
            <div className="col-span-2">
                 <span className="text-gray-500 font-bold text-xs uppercase">ID</span>
                 <p className="font-mono text-gray-400 text-xs truncate">{selectedBlock?.id}</p>
            </div>
        </div>

        {/* 传送门入口按钮 */}
        {selectedBlock?.type === 'nested' && (
            <div className="bg-purple-900/30 border border-purple-500/50 p-3 rounded-lg mt-2">
                <p className="text-purple-300 font-bold text-sm mb-2">Target: {selectedBlock.worldName}</p>
                <button 
                    onClick={() => {
                        // 手动点击按钮进入时，通常直接居中 (无 callback)
                        events.emit('world:request-enter', selectedBlock.targetWorldId!, selectedBlock.worldName!);
                    }}
                    className="w-full py-2 bg-purple-600 hover:bg-purple-700 rounded text-sm font-bold transition-colors"
                >
                    Enter World
                </button>
            </div>
        )}
      </div>
    </div>
  );
}