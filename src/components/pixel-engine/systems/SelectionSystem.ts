// src/systems/SelectionSystem.ts

import { IEngine, SelectionRect, ClipboardData, PixelBlock, Vec2 } from '../types';
import { MathUtils } from '../utils/MathUtils';
import { RemoveBlockCommand, AddBlockCommand, BatchCommand, RestoreSelectionCommand } from '../commands'; 

export class SelectionSystem {
    private _selection: SelectionRect | null = null;
    private _selectedIds: Set<string> = new Set();
    private _selectedBlocksMap: Map<string, PixelBlock> = new Map();

    private _liftedBlocks: PixelBlock[] = [];
    private _originalBlocks: PixelBlock[] = [];
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

    // --- Snapshot Restoration ---
    public restoreSnapshot(ids: string[], rect: SelectionRect | null) {
        this._selectedIds.clear();
        this._selectedBlocksMap.clear();
        this._selection = null;

        if (!ids || ids.length === 0) {
            this.setSelection(null);
            return;
        }

        let foundAny = false;
        const world = this.engine.world as any; 

        ids.forEach(id => {
            const block = world.getBlockById ? world.getBlockById(id) : null;
            if (block) {
                this._selectedIds.add(id);
                this._selectedBlocksMap.set(id, block);
                foundAny = true;
            }
        });

        if (foundAny && rect) {
            this.setSelection(rect, true);
            this.prepareLiftData();
        } else {
            this.clear();
        }
        
        this.emitUpdate();
    }

    // --- Visual Update ---
    
    // [Fix] 直接使用传入的 Rect，不再二次 snap 宽高，防止尺寸回缩
    public setMarqueeRect(rect: SelectionRect) {
        const gridSize = 20; // 建议从 config 获取
        
        this._selection = {
            // 使用 round 确保无浮点误差，信任 Tool 传来的对齐数据
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

    // --- Core: Lift / Place ---
    private prepareLiftData() {
        if (!this._selection || this._selectedBlocksMap.size === 0) {
            this._liftedBlocks = [];
            this._originalBlocks = [];
            return;
        }
        const blocks = Array.from(this._selectedBlocksMap.values());
        this._originalBlocks = blocks.map(b => ({ ...b }));
        this._liftedBlocks = blocks.map(b => ({
            ...b,
            x: b.x - this._selection!.x,
            y: b.y - this._selection!.y
        }));
        this._isCacheDirty = true;
    }

    public lift() {
        if (!this._selection || this.isLifted) return;
        if (this._liftedBlocks.length === 0) this.prepareLiftData();
        if (this._liftedBlocks.length === 0) return;

        this._liftStartPos = { x: this._selection.x, y: this._selection.y };
        this._originalBlocks.forEach(b => this.engine.world.removeBlockById(b.id));
        this.isLifted = true;
        this.engine.requestRender();
    }

    public place(): boolean {
        if (!this._selection || !this.isLifted) return false;

        const targetX = this._selection.x;
        const targetY = this._selection.y;

        const isMoved = this._liftStartPos && (Math.abs(this._liftStartPos.x - targetX) > 0.1 || Math.abs(this._liftStartPos.y - targetY) > 0.1);
        if (!isMoved) {
            this.abortMove(); 
            return true;
        }

        if (!this.validatePlacement(targetX, targetY, this._liftedBlocks)) return false;

        // 1. Snapshot Before
        const snapshotBefore = {
            ids: this._originalBlocks.map(b => b.id),
            rect: this._liftStartPos ? {
                x: this._liftStartPos.x, y: this._liftStartPos.y,
                w: this._selection.w, h: this._selection.h
            } : null
        };

        // 2. Prepare Data
        const newBlocks: PixelBlock[] = [];
        const addCommands: any[] = [];
        const removeOriginals = this._originalBlocks.map(b => new RemoveBlockCommand(this.engine.world, b.x, b.y, b));

        this._liftedBlocks.forEach(b => {
            const newId = MathUtils.generateId('moved');
            const newBlock = { ...b, id: newId, x: targetX + b.x, y: targetY + b.y };
            newBlocks.push(newBlock);
            addCommands.push(new AddBlockCommand(this.engine.world, newBlock));
        });

        // 3. Snapshot After
        const snapshotAfter = {
            ids: newBlocks.map(b => b.id),
            rect: { ...this._selection }
        };

        const selectionCmd = new RestoreSelectionCommand(this, snapshotBefore, snapshotAfter);
        const batch = new BatchCommand([selectionCmd, ...removeOriginals, ...addCommands]);
        
        batch.execute(); 
        this.engine.events.emit('history:push', batch, true);
        
        // 4. Reset & Sync
        this.resetLiftState();
        this._selectedBlocksMap.clear();
        newBlocks.forEach(b => this._selectedBlocksMap.set(b.id, b));
        this.recalcBounds(); 
        
        this.engine.requestRender();
        return true;
    }

    public abortMove() {
        if (!this.isLifted) return;
        this._originalBlocks.forEach(b => this.engine.world.addBlock(b));
        if (this._liftStartPos && this._selection) {
            this._selection.x = this._liftStartPos.x;
            this._selection.y = this._liftStartPos.y;
        }
        this.isLifted = false;
        this._originalBlocks = [];
        this._liftStartPos = null;
        this._previewCanvas = null;
        
        this._selectedBlocksMap.clear();
        this._originalBlocks.forEach(b => this._selectedBlocksMap.set(b.id, b));
        this.recalcBounds();

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

    private bindClipboardEvents() { 
        window.addEventListener('keydown', (e) => {
            const isCtrl = e.ctrlKey || e.metaKey;
            if (isCtrl && e.code === 'KeyC' && this.hasSelection) {
                e.preventDefault();
                this.copy();
            }
        });
    }

    public async copy() {
        if (!this._selection || this._liftedBlocks.length === 0) return;
        const data: ClipboardData = { source: 'pixel-engine', width: this._selection.w, height: this._selection.h, blocks: this._liftedBlocks };
        try { await navigator.clipboard.writeText(JSON.stringify(data)); this.engine.events.emit('selection:copy'); } catch (e) {}
    }

    public async paste(pastePos: Vec2) {
        try {
            const text = await navigator.clipboard.readText();
            if(!text) return;
            const data: ClipboardData = JSON.parse(text);
            if(data.source !== 'pixel-engine') return;

            if(this.isLifted) { if(!this.place()) return; }

            const gridSize = 20;
            const targetX = MathUtils.snap(pastePos.x - data.width/2, gridSize);
            const targetY = MathUtils.snap(pastePos.y - data.height/2, gridSize);

            if (!this.validatePlacement(targetX, targetY, data.blocks)) return;

            const snapshotBefore = { 
                ids: Array.from(this._selectedIds), 
                rect: this._selection ? {...this._selection} : null 
            };

            const newBlocks: PixelBlock[] = [];
            const addCommands: any[] = [];

            data.blocks.forEach(b => {
                const newId = MathUtils.generateId('paste');
                const newBlock = { ...b, id: newId, x: targetX + b.x, y: targetY + b.y };
                newBlocks.push(newBlock);
                addCommands.push(new AddBlockCommand(this.engine.world, newBlock));
            });

            const snapshotAfter = {
                ids: newBlocks.map(b => b.id),
                rect: { x: targetX, y: targetY, w: data.width, h: data.height }
            };

            const selectionCmd = new RestoreSelectionCommand(this, snapshotBefore, snapshotAfter);
            const batch = new BatchCommand([selectionCmd, ...addCommands]);
            
            batch.execute();
            this.engine.events.emit('history:push', batch, true);
            
            this._selectedBlocksMap.clear();
            newBlocks.forEach(b => this._selectedBlocksMap.set(b.id, b));
            this.recalcBounds();

            this.engine.events.emit('selection:paste', data);
        } catch(e) {}
    }
}