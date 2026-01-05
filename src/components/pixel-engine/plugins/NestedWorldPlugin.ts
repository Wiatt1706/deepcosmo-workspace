// src/engine/plugins/NestedWorldPlugin.ts
import { IPlugin, IEngine, Vec2, PixelBlock } from '../types';

export class NestedWorldPlugin implements IPlugin {
  name = 'NestedWorld';
  private engine!: IEngine;
  private hoveredPortal: PixelBlock | null = null;

  onInit(engine: IEngine) {
    this.engine = engine;
    engine.events.on('input:dblclick', (pos, e) => this.onDoubleClick(pos));
    engine.events.on('input:mousemove', (pos, e) => this.onMouseMove(pos));
  }

  // 检测悬浮：如果鼠标在传送门上，改变光标样式
  private onMouseMove = (worldPos: Vec2) => {
    // getBlockAt 是我们在 World 中实现的方法
    const block = this.engine.world.getBlockAt(worldPos.x, worldPos.y);
    
    if (block && block.type === 'nested') {
        this.hoveredPortal = block;
        this.engine.canvas.style.cursor = 'pointer'; 
    } else {
        this.hoveredPortal = null;
        // 如果是从 pointer 离开的，恢复默认 (这里需要小心不覆盖 hand/crosshair)
        // 简单处理：仅当当前是 pointer 时才重置
        if (this.engine.canvas.style.cursor === 'pointer') {
            this.engine.canvas.style.cursor = 'default';
        }
    }
  };

  // 处理双击进入
  private onDoubleClick = (worldPos: Vec2) => {
    const block = this.engine.world.getBlockAt(worldPos.x, worldPos.y);
    
    if (block && block.type === 'nested' && block.targetWorldId) {
        console.log(`[NestedPlugin] Requesting enter world: ${block.targetWorldId}`);
        // 触发事件，通知 React 层进行数据切换
        this.engine.events.emit('world:request-enter', block.targetWorldId, block.worldName || 'Unknown World');
    }
  };

  onRender(ctx: CanvasRenderingContext2D) {
    // 给悬浮的传送门画一个高亮框和标签
    if (this.hoveredPortal) {
        const b = this.hoveredPortal;
        
        ctx.save();
        ctx.strokeStyle = '#a855f7'; // Purple-500
        ctx.lineWidth = 2 / this.engine.camera.zoom;
        ctx.strokeRect(b.x, b.y, b.w, b.h);
        
        // 绘制 Tooltip
        const text = `🚪 ${b.worldName || 'Portal'}`;
        ctx.font = `${12 / this.engine.camera.zoom}px sans-serif`;
        const textWidth = ctx.measureText(text).width;
        
        // 背景条
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(b.x, b.y - 24 / this.engine.camera.zoom, textWidth + 10, 20 / this.engine.camera.zoom);
        
        // 文字
        ctx.fillStyle = 'white';
        ctx.fillText(text, b.x + 5, b.y - 10 / this.engine.camera.zoom);
        
        ctx.restore();
    }
  }
}