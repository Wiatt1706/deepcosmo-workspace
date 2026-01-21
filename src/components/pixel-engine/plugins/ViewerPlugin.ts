// src/engine/plugins/ViewerPlugin.ts
import { IPlugin, IEngine, Vec2, PixelBlock } from '../types';

export class ViewerPlugin implements IPlugin {
  name = 'ViewerInteraction';
  private engine!: IEngine;
  
  // 状态
  private hoveredBlock: PixelBlock | null = null;
  private selectedBlock: PixelBlock | null = null;
  private mouseDownPos: Vec2 | null = null; // 记录按下位置
  
  // [Config] 维度切换阈值 (当方块宽度占屏幕宽度的 60% 时触发)
  private readonly ZOOM_ENTER_THRESHOLD = 0.6; 
  // [Config] 子世界标准尺寸估算值 (用于计算进入后的默认缩放)
  // 假设子世界的内容大概分布在 1000x1000 的范围内
  private readonly CHILD_WORLD_BASE_SIZE = 1000; 

  onInit(engine: IEngine) {
    this.engine = engine;
    
    // 1. 监听悬浮
    engine.events.on('input:mousemove', (pos) => this.handleHover(pos));
    
    // 2. 监听点击流程 (用于区分 Click 和 Drag)
    engine.events.on('input:mousedown', (pos, e) => {
        // 记录屏幕坐标，而不是世界坐标，因为世界坐标会随拖拽变化
        this.mouseDownPos = { x: e.clientX, y: e.clientY };
    });
    engine.events.on('input:mouseup', (pos, e) => this.handleClick(pos, e));
    
    // 3. 监听滚轮 (无限缩放检测)
    engine.events.on('input:wheel', () => this.checkInfiniteZoomTransition());
  }

  private handleHover(worldPos: Vec2) {
    if (this.engine.input.isDragging) return;

    const block = this.engine.world.getBlockAt(worldPos.x, worldPos.y);
    
    // 状态去重
    if (block?.id !== this.hoveredBlock?.id) {
        this.hoveredBlock = block;
        this.engine.events.emit('viewer:block-hover', block);
        this.engine.canvas.style.cursor = block ? 'pointer' : 'default';
    }
  }

  private handleClick(worldPos: Vec2, e: MouseEvent) {
    if (!this.mouseDownPos) return;

    // 计算移动距离
    const dx = e.clientX - this.mouseDownPos.x;
    const dy = e.clientY - this.mouseDownPos.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // 清理
    this.mouseDownPos = null;

    // 如果移动超过 5px，认为是拖拽，不触发点击
    if (dist > 5) return;

    // --- 执行点击逻辑 ---
    const block = this.engine.world.getBlockAt(worldPos.x, worldPos.y);
    
    console.log('[ViewerPlugin] Selected:', block);

    this.selectedBlock = block;
    this.engine.events.emit('viewer:block-selected', block);
    
    // 点击方块时，让摄像机平滑居中 (增强体验)
    if (block) {
        const centerX = block.x + block.w / 2;
        const centerY = block.y + block.h / 2;
        this.engine.camera.panToSmooth(centerX, centerY);
    }
  }

  /**
   * [Core] 无缝钻入计算
   * 算法核心：保持摄像机相对于"方块中心"的归一化偏移量不变。
   */
  private checkInfiniteZoomTransition() {
    if (!this.hoveredBlock || this.hoveredBlock.type !== 'nested') return;

    const camera = this.engine.camera;
    const block = this.hoveredBlock;

    // 1. 计算覆盖率
    const screenW = block.w * camera.zoom;
    const canvasW = this.engine.canvas.width / (window.devicePixelRatio || 1);
    
    if (screenW / canvasW > this.ZOOM_ENTER_THRESHOLD) {
       console.log(`[Viewer] 🚀 Entering Dimension: ${block.targetWorldId}`);
       
       // --- A. 计算当前状态 ---
       // 计算摄像机相对于方块中心的偏移比率 (-0.5 ~ 0.5)
       const blockCenterX = block.x + block.w / 2;
       const blockCenterY = block.y + block.h / 2;
       
       // 如果 camera.x = blockCenterX，则 ratio = 0
       const relativeX = (camera.x - blockCenterX) / block.w;
       const relativeY = (camera.y - blockCenterY) / block.h;

       // --- B. 触发切换 ---
       // 传递 callback，在 React 完成数据加载后执行
       this.engine.events.emit(
           'world:request-enter', 
           block.targetWorldId!, 
           block.worldName || 'Unknown',
           () => {
               // --- C. 在新世界中还原视角 (回调函数) ---
               
               // 1. 估算新位置：将偏移比率应用到子世界的基准尺寸上
               // 比如我在父世界偏左看方块，进入子世界后我也应该在中心偏左的位置
               const newX = relativeX * this.CHILD_WORLD_BASE_SIZE;
               const newY = relativeY * this.CHILD_WORLD_BASE_SIZE;
               
               // 2. 计算无缝缩放比 (Equivalent Zoom)
               // 公式：OldZoom * BlockSize = NewZoom * ChildWorldSize
               // 我们希望进入后，视野稍微开阔一点点，所以乘以一个缩小系数 (0.8)
               // 防止一进来就贴在某个巨型物体上
               const scaleFactor = 0.6; 
               const exactZoom = (camera.zoom * block.w) / this.CHILD_WORLD_BASE_SIZE;
               const targetZoom = Math.max(0.5, exactZoom * scaleFactor);

               // 3. 执行传送 (瞬间改变，无动画)
               camera.teleport(newX, newY, targetZoom);
               
               // 4. 清理状态
               this.hoveredBlock = null;
               this.selectedBlock = null;
               // 此时可能需要再次触发一次 render 以避免一帧的黑屏
               this.engine.renderer.draw();
           }
       );
    }
  }

  onRender(ctx: CanvasRenderingContext2D) {
    const zoom = this.engine.camera.zoom;

    // Hover Effect
    if (this.hoveredBlock) {
        const b = this.hoveredBlock;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.lineWidth = 2 / zoom;
        ctx.strokeRect(b.x, b.y, b.w, b.h);
        
        if (b.type === 'nested') {
            // 提示文字
            ctx.fillStyle = '#a855f7';
            ctx.font = `${Math.max(12, 14/zoom)}px sans-serif`; // 限制最小字号可见
            ctx.fillText(`🔭 ${b.worldName}`, b.x, b.y - 5/zoom);
        }
    }

    // Selected Effect
    if (this.selectedBlock) {
        const b = this.selectedBlock;
        ctx.strokeStyle = '#facc15'; // Yellow
        ctx.lineWidth = 4 / zoom;
        ctx.strokeRect(b.x, b.y, b.w, b.h);
    }
  }
}