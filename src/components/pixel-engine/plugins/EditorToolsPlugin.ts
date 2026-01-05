// src/engine/plugins/EditorToolsPlugin.ts
import { IPlugin, IEngine, ToolType, Vec2 } from '../types';
import { AddBlockCommand, RemoveBlockCommand } from '../commands'; // 确保你有 commands.ts

export class EditorToolsPlugin implements IPlugin {
  name = 'EditorTools';
  private engine!: IEngine;

  // Tools State
  private currentTool: ToolType = 'brush';
  private color: string = '#3b82f6';
  private imageUrl: string = '';
  private gridSize: number = 20;

  // Drag State
  private dragStartWorld: Vec2 | null = null;

  onInit(engine: IEngine) {
    this.engine = engine;

    // Listen to Input
    engine.events.on('input:mousedown', (pos, e) => this.onMouseDown(pos, e));
    engine.events.on('input:mousemove', (pos, e) => this.onMouseMove(pos, e));
    engine.events.on('input:mouseup', (pos, e) => this.onMouseUp(pos));

    // Listen to UI Commands
    engine.events.on('tool:set', (t) => { this.currentTool = t; this.updateCursor(); });
    engine.events.on('color:set', (c) => this.color = c);
    engine.events.on('image:set', (url) => this.imageUrl = url);
  }

  private snap(val: number) {
    return Math.floor(val / this.gridSize) * this.gridSize;
  }

  // --- Handlers ---

  private onMouseDown = (worldPos: Vec2, e: MouseEvent) => {
    if (this.engine.input.isSpacePressed || this.currentTool === 'hand') {
      this.engine.canvas.style.cursor = 'grabbing';
      return;
    }

    if (this.currentTool === 'rectangle') {
      this.dragStartWorld = { ...worldPos };
    } else {
      this.paint(worldPos);
    }
  };

  private onMouseMove = (worldPos: Vec2, e: MouseEvent) => {
    if (this.engine.input.isDragging && (this.engine.input.isSpacePressed || this.currentTool === 'hand')) {
      const dx = e.movementX;
      const dy = e.movementY;
      this.engine.camera.x -= dx / this.engine.camera.zoom;
      this.engine.camera.y -= dy / this.engine.camera.zoom;
      return;
    }

    if (this.engine.input.isDragging && (this.currentTool === 'brush' || this.currentTool === 'eraser')) {
      this.paint(worldPos);
    }
  };

  private onMouseUp = (worldPos: Vec2) => {
    this.updateCursor();

    if (this.currentTool === 'rectangle' && this.dragStartWorld) {
      const rect = this.calcRect(this.dragStartWorld, worldPos);
      const cmd = new AddBlockCommand(this.engine.world, {
        id: `rect_${Date.now()}`,
        x: rect.x, y: rect.y, w: rect.w, h: rect.h,
        color: this.color,
        type: 'basic'
      });
      this.engine.events.emit('history:push', cmd);
      this.dragStartWorld = null;
    }
  };

  // --- Logic ---

  private paint(pos: Vec2) {
    const gx = this.snap(pos.x);
    const gy = this.snap(pos.y);

    if (this.currentTool === 'brush') {
      const cmd = new AddBlockCommand(this.engine.world, {
        id: `b_${Date.now()}_${Math.random()}`,
        x: gx, y: gy, w: this.gridSize, h: this.gridSize,
        color: this.color,
        type: 'basic'
      });
      this.engine.events.emit('history:push', cmd);
    } 
    else if (this.currentTool === 'eraser') {
      const cmd = new RemoveBlockCommand(this.engine.world, gx + 1, gy + 1);
      this.engine.events.emit('history:push', cmd);
    } 
    else if (this.currentTool === 'image_stamp' && this.imageUrl) {
       const cmd = new AddBlockCommand(this.engine.world, {
        id: `img_${Date.now()}`,
        x: gx, y: gy, w: this.gridSize * 2, h: this.gridSize * 2,
        color: '#ccc',
        type: 'image',
        imageUrl: this.imageUrl
      });
      this.engine.events.emit('history:push', cmd);
    }
    // [New] 绘制传送门
    else if (this.currentTool === 'portal') {
        const newWorldId = `world_${Date.now()}`;
        const cmd = new AddBlockCommand(this.engine.world, {
            id: `portal_${Date.now()}`,
            x: gx, y: gy, w: this.gridSize * 2, h: this.gridSize * 2,
            color: '#a855f7', // 紫色
            type: 'nested',
            targetWorldId: newWorldId,
            worldName: `Room ${newWorldId.slice(-4)}`
        });
        this.engine.events.emit('history:push', cmd);
        // 画完一个就切回手型，防止误操作
        this.engine.events.emit('tool:set', 'hand');
    }
  }

  private calcRect(start: Vec2, current: Vec2) {
    const sx = this.snap(start.x);
    const sy = this.snap(start.y);
    const cx = this.snap(current.x);
    const cy = this.snap(current.y);
    return {
      x: Math.min(sx, cx),
      y: Math.min(sy, cy),
      w: Math.abs(cx - sx) + this.gridSize,
      h: Math.abs(cy - sy) + this.gridSize
    };
  }

  private updateCursor() {
    if (this.engine.input.isSpacePressed || this.currentTool === 'hand') {
      this.engine.canvas.style.cursor = 'grab';
    } else {
      this.engine.canvas.style.cursor = 'crosshair';
    }
  }
  
  onRender(ctx: CanvasRenderingContext2D) {
    if (this.engine.input.isSpacePressed || this.currentTool === 'hand') return;
    const mouse = this.engine.input.mouseWorld;

    if (this.currentTool === 'rectangle' && this.engine.input.isDragging && this.dragStartWorld) {
      const rect = this.calcRect(this.dragStartWorld, mouse);
      ctx.fillStyle = this.color;
      ctx.globalAlpha = 0.5;
      ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
      ctx.globalAlpha = 1.0;
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1 / this.engine.camera.zoom;
      ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
      return;
    }

    const gx = this.snap(mouse.x);
    const gy = this.snap(mouse.y);
    let w = this.gridSize;
    let h = this.gridSize;
    if (this.currentTool === 'image_stamp' || this.currentTool === 'portal') { w *= 2; h *= 2; }

    if (this.currentTool === 'portal') {
        ctx.fillStyle = 'rgba(168, 85, 247, 0.5)'; // 紫色半透明
    } else {
        ctx.fillStyle = this.currentTool === 'eraser' ? 'rgba(255,0,0,0.3)' : 'rgba(59,130,246,0.3)';
    }
    
    ctx.fillRect(gx, gy, w, h);
    ctx.strokeStyle = 'rgba(255,255,255,0.8)';
    ctx.lineWidth = 1 / this.engine.camera.zoom;
    ctx.strokeRect(gx, gy, w, h);
  }
}