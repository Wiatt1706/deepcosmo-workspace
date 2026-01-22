import { IEngine, SelectionRect, ClipboardData, PixelBlock, Vec2 } from '../types';
import { MathUtils } from '../utils/MathUtils';
// 动态导入避免循环依赖，或者使用接口。这里为了代码清晰假设 AddBlockCommand 已导出
import { BatchCommand, AddBlockCommand } from '../commands'; 

/**
 * [System] 选区管理系统
 * 负责维护选区状态、处理剪贴板数据。
 * 核心原则：所有坐标计算严格对齐网格 (Grid Snapping)。
 */
export class SelectionSystem {
    // 当前选区的几何范围
    private _selection: SelectionRect | null = null;
    
    // [Lifted] 提起的数据缓存 (相当于剪贴板的内存副本)
    private _liftedBlocks: PixelBlock[] = [];

    constructor(private engine: IEngine) {
        this.bindClipboardEvents();
    }

    // --- Public API ---

    public get currentSelection() { return this._selection; }
    public get hasSelection() { return this._selection !== null; }
    
    // 获取当前暂存的方块（供渲染层预览使用）
    public get liftedBlocks() { return this._liftedBlocks; }

    public setSelection(rect: SelectionRect | null) {
        if (!rect) {
            this._selection = null;
            this._liftedBlocks = [];
        } else {
            // 强制规范化：确保宽高为正，且严格对齐网格
            // 假设 GridSize = 20 (后续应从 Config 获取)
            const gridSize = 20; 
            
            this._selection = {
                x: MathUtils.snap(rect.w < 0 ? rect.x + rect.w : rect.x, gridSize),
                y: MathUtils.snap(rect.h < 0 ? rect.y + rect.h : rect.y, gridSize),
                w: MathUtils.snap(Math.abs(rect.w), gridSize),
                h: MathUtils.snap(Math.abs(rect.h), gridSize)
            };
            
            // 选中时，立即查询区域内的方块并缓存
            this.captureSelectionData();
        }
        
        this.engine.events.emit('selection:change', this._selection);
        this.engine.requestRender();
    }

    public clear() {
        this.setSelection(null);
    }

    // --- 核心业务逻辑 ---

    /**
     * [Discrete] 捕获选区内的数据
     * 将 World 中的方块映射为相对坐标，存入 LiftedBuffer
     */
    private captureSelectionData() {
        if (!this._selection) return;

        const rawBlocks = this.engine.world.queryBlocksInRect(
            this._selection.x,
            this._selection.y,
            this._selection.x + this._selection.w,
            this._selection.y + this._selection.h
        );

        // 转换为相对坐标 (Relative to Selection Top-Left)
        this._liftedBlocks = rawBlocks.map(b => ({
            ...b,
            x: b.x - this._selection!.x,
            y: b.y - this._selection!.y
        }));
    }

    public async copy() {
        if (!this._selection || this._liftedBlocks.length === 0) return;

        const data: ClipboardData = {
            source: 'pixel-engine',
            width: this._selection.w,
            height: this._selection.h,
            blocks: this._liftedBlocks // 已经是相对坐标了
        };

        try {
            await navigator.clipboard.writeText(JSON.stringify(data));
            console.log(`[Selection] Copied ${data.blocks.length} blocks.`);
            this.engine.events.emit('selection:copy');
        } catch (err) {
            console.error('Copy failed:', err);
        }
    }

    public async paste(pastePos: Vec2) {
        try {
            const text = await navigator.clipboard.readText();
            if (!text) return;
            
            const data: ClipboardData = JSON.parse(text);
            if (data.source !== 'pixel-engine') return;

            // [Step-based Alignment] 粘贴位置严格对齐网格
            const gridSize = 20; 
            const targetX = MathUtils.snap(pastePos.x - data.width / 2, gridSize);
            const targetY = MathUtils.snap(pastePos.y - data.height / 2, gridSize);

            // 构造命令
            const commands = data.blocks.map(b => {
                return new AddBlockCommand(this.engine.world, {
                    ...b,
                    id: MathUtils.generateId('p'),
                    x: targetX + b.x, // 绝对坐标 = 基准点 + 相对坐标
                    y: targetY + b.y
                });
            });

            if (commands.length > 0) {
                const batch = new BatchCommand(commands);
                this.engine.events.emit('history:push', batch, true);
                
                // 粘贴后选中新区域
                this.setSelection({
                    x: targetX,
                    y: targetY,
                    w: data.width,
                    h: data.height
                });
            }
            this.engine.events.emit('selection:paste', data);

        } catch (err) {
            console.error('Paste failed:', err);
        }
    }

    // --- 事件绑定 ---
    private bindClipboardEvents() {
        window.addEventListener('keydown', (e) => {
            const isCtrl = e.ctrlKey || e.metaKey;
            // 仅处理 Copy，Paste通常需要鼠标位置，交给 Tool 或上面的 public paste 处理
            if (isCtrl && e.code === 'KeyC' && this.hasSelection) {
                e.preventDefault();
                this.copy();
            }
        });
    }
}