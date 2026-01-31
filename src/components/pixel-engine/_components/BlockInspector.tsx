// src/components/pixel-engine/BlockInspector.tsx
"use client";
import React, { useEffect, useState } from 'react';
import { usePixelEngine }  from '../PixelContext';
import { PixelBlock } from '../types';
import { X, Save, Trash2 } from 'lucide-react';
import { AddBlockCommand, RemoveBlockCommand, BatchCommand } from '../commands';

export function BlockInspector() {
    const { events, engine } = usePixelEngine();
    const [selectedBlock, setSelectedBlock] = useState<PixelBlock | null>(null);
    
    // 表单状态
    const [editValues, setEditValues] = useState<{color: string, url: string, link: string}>({
        color: '', url: '', link: ''
    });

    useEffect(() => {
        if (!events) return;
        
        const onBlockClick = (block: PixelBlock) => {
            // 初始化表单
            setSelectedBlock(block);
            setEditValues({
                color: block.color || '#ffffff',
                url: block.imageUrl || '',
                link: block.targetWorldId || '' 
            });
        };
        
        // 监听工具发出的点击事件
        events.on('editor:block-click', onBlockClick);
        
        // 额外的优化：如果切换工具或者选区变化，关闭浮窗
        const closeInspector = () => setSelectedBlock(null);
        events.on('tool:set', closeInspector);
        events.on('selection:change', closeInspector);
        
        return () => {
            events.off('editor:block-click', onBlockClick);
            events.off('tool:set', closeInspector);
            events.off('selection:change', closeInspector);
        };
    }, [events]);

    if (!selectedBlock || !engine) return null;

    const handleSave = () => {
        if (!selectedBlock) return;

        // 构建新的方块数据
        const newBlock: PixelBlock = {
            ...selectedBlock,
            color: editValues.color,
            imageUrl: editValues.url || undefined,
            // 简单的类型推断逻辑：有URL是图片，有ID是传送门，否则是基础块
            type: editValues.url ? 'image' : (editValues.link ? 'nested' : 'basic'),
            targetWorldId: editValues.link || undefined,
            worldName: editValues.link ? `Link to ${editValues.link}` : undefined
        };

        // 使用 BatchCommand 实现“修改”操作 (即 删除旧的 + 添加新的)
        // 这样 Undo 的时候只需一步
        const removeCmd = new RemoveBlockCommand(engine.world, selectedBlock.x, selectedBlock.y, selectedBlock);
        const addCmd = new AddBlockCommand(engine.world, newBlock);
        
        const batch = new BatchCommand([removeCmd, addCmd]);
        
        batch.execute();
        engine.events.emit('history:push', batch, true);

        engine.requestRender();
        setSelectedBlock(null); // 保存后关闭
    };

    const handleDelete = () => {
        const cmd = new RemoveBlockCommand(engine.world, selectedBlock.x, selectedBlock.y, selectedBlock);
        cmd.execute();
        engine.events.emit('history:push', cmd, true);
        
        engine.requestRender();
        setSelectedBlock(null);
    };

    return (
        <div className="absolute top-16 right-4 w-64 bg-white rounded-lg shadow-xl border border-gray-200 p-4 z-50 animate-in slide-in-from-right-5 fade-in duration-200">
            <div className="flex items-center justify-between mb-4 border-b pb-2">
                <h3 className="font-semibold text-sm">Edit Pixel Block</h3>
                <button onClick={() => setSelectedBlock(null)} className="text-gray-400 hover:text-gray-600">
                    <X size={16} />
                </button>
            </div>

            <div className="space-y-4">
                {/* 颜色编辑 */}
                <div className="space-y-1">
                    <label className="text-xs text-gray-500">Color</label>
                    <div className="flex gap-2">
                        <input 
                            type="color" 
                            value={editValues.color}
                            onChange={(e) => setEditValues({...editValues, color: e.target.value})}
                            className="h-8 w-8 cursor-pointer border rounded"
                        />
                        <input 
                            type="text" 
                            value={editValues.color}
                            onChange={(e) => setEditValues({...editValues, color: e.target.value})}
                            className="flex-1 text-xs border rounded px-2 uppercase"
                        />
                    </div>
                </div>

                {/* 图片链接 */}
                <div className="space-y-1">
                    <label className="text-xs text-gray-500">Image URL (Optional)</label>
                    <input 
                        type="text" 
                        value={editValues.url}
                        placeholder="https://..."
                        onChange={(e) => setEditValues({...editValues, url: e.target.value})}
                        className="w-full text-xs border rounded px-2 py-1.5 focus:outline-none focus:border-blue-500"
                    />
                </div>
                
                {/* 传送门 ID */}
                <div className="space-y-1">
                    <label className="text-xs text-gray-500">Portal Target ID</label>
                    <input 
                        type="text" 
                        value={editValues.link}
                        placeholder="world-xyz..."
                        onChange={(e) => setEditValues({...editValues, link: e.target.value})}
                        className="w-full text-xs border rounded px-2 py-1.5 focus:outline-none focus:border-blue-500"
                    />
                </div>

                <div className="flex gap-2 pt-2">
                    <button 
                        onClick={handleDelete}
                        className="flex-1 flex items-center justify-center gap-1 bg-red-50 text-red-600 py-1.5 rounded text-xs hover:bg-red-100 transition"
                    >
                        <Trash2 size={12} /> Delete
                    </button>
                    <button 
                        onClick={handleSave}
                        className="flex-1 flex items-center justify-center gap-1 bg-blue-600 text-white py-1.5 rounded text-xs hover:bg-blue-700 transition"
                    >
                        <Save size={12} /> Save
                    </button>
                </div>
            </div>
        </div>
    );
}