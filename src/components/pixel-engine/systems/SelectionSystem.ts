import { IEngine, SelectionRect, ClipboardData, PixelBlock, Vec2 } from '../types';
import { MathUtils } from '../utils/MathUtils';
import { OpType } from '../history/types';

export class SelectionSystem {
    private _selection: SelectionRect | null = null;
    private _selectedIds: Set<string> = new Set();
    private _selectedBlocksMap: Map<string, PixelBlock> = new Map();

    private _liftedBlocks: PixelBlock[] = []; // 浮起的临时数据（视觉上在移动，但尚未写入World）
    private _originalBlocks: PixelBlock[] = []; // 移动前的原始数据（用于撤销或放弃移动）
    private _liftStartPos: Vec2 | null = null;
    
    private _previewCanvas: HTMLCanvasElement | null = null;
    private _previewCtx: CanvasRenderingContext2D | null = null;
    private _isCacheDirty: boolean = false;

    public isLifted: boolean = false;

    constructor(private engine: IEngine) {
        this.bindClipboardEvents();
    }

    // --- Getters ---
    public get currentSelection() { return this._selection; }
    public get hasSelection() { return this._selection !== null; }
    public get liftedBlocks() { return this._liftedBlocks; }
    public get selectedIds() { return this._selectedIds; }

    // --- Visual Update ---
    public setMarqueeRect(rect: SelectionRect) {
        const gridSize = this.engine.config.gridSize || 20;
        this._selection = {
            x: Math.round(rect.x),
            y: Math.round(rect.y),
            w: Math.round(rect.w),
            h: Math.round(rect.h)
        };
        // 最小尺寸保护
        if (this._selection.w < gridSize) this._selection.w = gridSize;
        if (this._selection.h < gridSize) this._selection.h = gridSize;
        
        this.emitUpdate();
    }

    // --- Logic Selection ---
    public handlePointSelection(block: PixelBlock | null, isShift: boolean) {
        if (!block) {
            if (!isShift) this.clear();
            return;
        }
        if (!isShift) this._selectedBlocksMap.clear();

        if (this._selectedBlocksMap.has(block.id)) {
            if (isShift) this._selectedBlocksMap.delete(block.id);
        } else {
            this._selectedBlocksMap.set(block.id, block);
        }
        this.recalcBounds();
    }

    public handleRegionSelection(rect: SelectionRect, isShift: boolean) {
        const blocks = this.engine.world.queryBlocksInRect(rect.x, rect.y, rect.x + rect.w, rect.y + rect.h);
        if (!isShift) this._selectedBlocksMap.clear();
        blocks.forEach(b => this._selectedBlocksMap.set(b.id, b));
        this.recalcBounds();
    }

    private recalcBounds() {
        this._selectedIds.clear();
        if (this._selectedBlocksMap.size === 0) {
            this.setSelection(null);
            return;
        }

        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (const b of this._selectedBlocksMap.values()) {
            this._selectedIds.add(b.id);
            minX = Math.min(minX, b.x);
            minY = Math.min(minY, b.y);
            maxX = Math.max(maxX, b.x + b.w);
            maxY = Math.max(maxY, b.y + b.h);
        }

        this.setSelection({ 
            x: minX, y: minY, w: maxX - minX, h: maxY - minY 
        }, true);
        
        this.prepareLiftData();
    }

    // --- State Management ---
    public setSelection(rect: SelectionRect | null, skipCapture: boolean = false) {
        if (!rect) {
            if (this.isLifted) {
                // 如果正在浮起状态下取消选择，默认视为“确认放置”
                if (!this.place()) this.abortMove();
            }
            this._selection = null;
            this._liftedBlocks = [];
            this._previewCanvas = null;
            if (!skipCapture) {
                this._selectedBlocksMap.clear();
                this._selectedIds.clear();
            }
        } else {
            this._selection = {
                x: rect.w < 0 ? rect.x + rect.w : rect.x,
                y: rect.h < 0 ? rect.y + rect.h : rect.y,
                w: Math.abs(rect.w),
                h: Math.abs(rect.h)
            };
            
            if (!this.isLifted && !skipCapture) {
                this.handleRegionSelection(this._selection!, false);
            }
        }
        this.emitUpdate();
    }

    public clear() { this.setSelection(null); }

    // =========================================================
    // Core: Lift / Place (Drag & Drop Logic)
    // 重构点：使用 HistorySystem 替代 BatchCommand
    // =========================================================

    private prepareLiftData() {
        if (!this._selection || this._selectedBlocksMap.size === 0) {
            this._liftedBlocks = [];
            this._originalBlocks = [];
            return;
        }
        const blocks = Array.from(this._selectedBlocksMap.values());
        // 深拷贝原始数据，用于“放弃移动”或“生成删除Op”
        this._originalBlocks = blocks.map(b => ({ ...b }));
        
        // 生成浮动数据 (坐标归零，相对于 Selection 原点)
        this._liftedBlocks = blocks.map(b => ({
            ...b,
            x: b.x - this._selection!.x,
            y: b.y - this._selection!.y
        }));
        this._isCacheDirty = true;
    }

    /**
     * 起飞：将方块从 World 中临时移除，进入“浮动层”
     * 注意：此时不记录 History，因为移动还没完成
     */
    public lift() {
        if (!this._selection || this.isLifted) return;
        if (this._liftedBlocks.length === 0) this.prepareLiftData();
        if (this._liftedBlocks.length === 0) return;

        this._liftStartPos = { x: this._selection.x, y: this._selection.y };
        
        // 从 World 物理移除 (视觉上由 SelectionLayer 接管渲染)
        this._originalBlocks.forEach(b => this.engine.world.removeBlockById(b.id));
        
        this.isLifted = true;
        this.engine.requestRender();
    }

    /**
     * 放置：确认移动，生成并提交事务
     */
    public place(): boolean {
        if (!this._selection || !this.isLifted) return false;

        const targetX = this._selection.x;
        const targetY = this._selection.y;

        // 1. 检查是否有位移
        const isMoved = this._liftStartPos && (Math.abs(this._liftStartPos.x - targetX) > 0.1 || Math.abs(this._liftStartPos.y - targetY) > 0.1);
        
        // 如果没动，直接原地复原 (Abort)
        if (!isMoved) {
            this.abortMove(); 
            return true;
        }

        // 2. 检查碰撞 (放置位置是否被占用)
        // 注意：此时 world 里已经没有了 originalBlocks，所以只需检查目标位置是否有 *其他* 方块
        if (!this.validatePlacement(targetX, targetY, this._liftedBlocks)) return false;

        // ============================
        // [Transaction] Start: Move Selection
        // ============================
        this.engine.history.beginTransaction("Move Selection");

        const newBlocks: PixelBlock[] = [];

        // A. 记录删除旧方块 (Remove Originals)
        this._originalBlocks.forEach(oldBlock => {
            // World 里已经删了(lift时删的)，但我们需要记录 History
            // 为了保证数据一致性，这里仅仅是补录 Op
            this.engine.history.record({
                type: OpType.REMOVE,
                id: oldBlock.id,
                prevBlock: oldBlock
            });
        });

        // B. 记录添加新方块 (Add New at Target)
        this._liftedBlocks.forEach(b => {
            const newId = MathUtils.generateId('moved'); // 移动视为“销毁旧的，创建新的”
            const newBlock = { ...b, id: newId, x: targetX + b.x, y: targetY + b.y };
            
            newBlocks.push(newBlock);
            
            // 执行 Add
            this.engine.world.addBlock(newBlock);
            // 记录 Op
            this.engine.history.record({
                type: OpType.ADD,
                block: newBlock
            });
        });

        // [Transaction] Commit
        this.engine.history.commitTransaction();
        // ============================

        // 4. Reset & Sync State
        this.resetLiftState();
        
        // 更新选中状态为新方块
        this._selectedBlocksMap.clear();
        newBlocks.forEach(b => this._selectedBlocksMap.set(b.id, b));
        this.recalcBounds(); 
        
        this.engine.requestRender();
        return true;
    }

    /**
     * 放弃移动：将方块放回原处 (不产生 History)
     */
    public abortMove() {
        if (!this.isLifted) return;
        
        // 默默把原始方块加回去
        this._originalBlocks.forEach(b => this.engine.world.addBlock(b));
        
        // 恢复选区位置
        if (this._liftStartPos && this._selection) {
            this._selection.x = this._liftStartPos.x;
            this._selection.y = this._liftStartPos.y;
        }
        
        this.isLifted = false;
        this._originalBlocks = [];
        this._liftStartPos = null;
        this._previewCanvas = null;
        
        // 恢复选中状态
        this._selectedBlocksMap.clear();
        this._originalBlocks.forEach(b => this._selectedBlocksMap.set(b.id, b));
        this.recalcBounds(); // 重新计算边界，确保没有浮点误差

        this.emitUpdate();
    }

    // --- Helpers ---
    public getPreviewCanvas() {
        if (this._isCacheDirty) this.updatePreviewCache();
        return this._previewCanvas;
    }

    private validatePlacement(ox: number, oy: number, blocks: PixelBlock[]) {
        for(const b of blocks) {
            if(this.engine.world.isRegionOccupied(ox+b.x, oy+b.y, b.w, b.h)) return false;
        }
        return true;
    }

    private updatePreviewCache() {
        if (!this._selection) { this._previewCanvas = null; return; }
        if (!this._previewCanvas) {
            this._previewCanvas = document.createElement('canvas');
            this._previewCtx = this._previewCanvas.getContext('2d');
        }
        // Resize check
        if (this._previewCanvas.width !== this._selection.w || this._previewCanvas.height !== this._selection.h) {
             this._previewCanvas.width = this._selection.w;
             this._previewCanvas.height = this._selection.h;
        }
        const ctx = this._previewCtx!;
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        
        for (const b of this._liftedBlocks) {
            if (b.type === 'image' && b.imageUrl) {
                const img = this.engine.assets.getTexture(b.imageUrl);
                if (img) ctx.drawImage(img, b.x, b.y, b.w, b.h);
            } else {
                ctx.fillStyle = b.color;
                ctx.fillRect(b.x, b.y, b.w, b.h);
            }
        }
        this._isCacheDirty = false;
    }

    private resetLiftState() {
        this.isLifted = false;
        this._originalBlocks = [];
        this._liftStartPos = null;
        this._previewCanvas = null;
    }

    private emitUpdate() {
        this.engine.events.emit('selection:change', this._selection);
        this.engine.requestRender();
    }

    // =========================================================
    // Clipboard: Copy / Paste
    // =========================================================

    private bindClipboardEvents() { 
        window.addEventListener('keydown', (e) => {
            // 忽略输入框
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

            const isCtrl = e.ctrlKey || e.metaKey;
            if (isCtrl && e.code === 'KeyC' && this.hasSelection) {
                e.preventDefault();
                this.copy();
            }
            // Paste 通常由浏览器菜单或 Ctrl+V 触发，但出于安全限制，建议监听 'paste' 事件
            // 这里为了简化演示，假设外部或 KeybindingSystem 会调用 paste
        });
    }

    public async copy() {
        // 1. 如果当前没有浮动数据，尝试从选区生成
        if (!this._selection || this._liftedBlocks.length === 0) {
            this.prepareLiftData();
        }

        // [Fix] 显式检查 this._selection 是否为空
        // TypeScript 无法推断 prepareLiftData 后 _selection 一定存在
        // 所以这里必须写 (!this._selection || ...)
        if (!this._selection || this._liftedBlocks.length === 0) return;

        const data: ClipboardData = { 
            source: 'pixel-engine', 
            // 此时 TypeScript 知道 this._selection 一定不为 null
            width: this._selection.w, 
            height: this._selection.h, 
            blocks: this._liftedBlocks 
        };
        
        try { 
            await navigator.clipboard.writeText(JSON.stringify(data)); 
            this.engine.events.emit('selection:copy'); 
        } catch (e) {
            console.error("Clipboard Copy Failed", e);
        }
    }

    public async paste(pastePos: Vec2) {
        try {
            const text = await navigator.clipboard.readText();
            if(!text) return;
            
            let data: ClipboardData;
            try {
                data = JSON.parse(text);
            } catch { return; } // 不是我们的数据
            
            if(data.source !== 'pixel-engine') return;

            // 如果当前正拎着东西，先强制放下
            if(this.isLifted) { if(!this.place()) return; }

            const gridSize = this.engine.config.gridSize || 20;
            const targetX = MathUtils.snap(pastePos.x - data.width/2, gridSize);
            const targetY = MathUtils.snap(pastePos.y - data.height/2, gridSize);

            if (!this.validatePlacement(targetX, targetY, data.blocks)) {
                console.warn("Paste blocked: region occupied");
                return;
            }

            // ============================
            // [Transaction] Start: Paste
            // ============================
            this.engine.history.beginTransaction("Paste");

            const newBlocks: PixelBlock[] = [];

            data.blocks.forEach(b => {
                const newId = MathUtils.generateId('paste');
                const newBlock = { ...b, id: newId, x: targetX + b.x, y: targetY + b.y };
                newBlocks.push(newBlock);
                
                // Add & Record
                this.engine.world.addBlock(newBlock);
                this.engine.history.record({
                    type: OpType.ADD,
                    block: newBlock
                });
            });

            // [Transaction] Commit
            this.engine.history.commitTransaction();
            // ============================

            // 更新选中状态
            this._selectedBlocksMap.clear();
            newBlocks.forEach(b => this._selectedBlocksMap.set(b.id, b));
            this.recalcBounds();

            this.engine.events.emit('selection:paste', data);
        } catch(e) {
            console.error("Paste failed", e);
        }
    }
}