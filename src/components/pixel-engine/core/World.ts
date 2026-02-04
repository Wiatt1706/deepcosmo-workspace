import { BlockMemory } from './BlockMemory';
import { PixelBlock, IWorld } from '../types';
import { BinaryCodec } from '../utils/BinaryCodec';
import { MathUtils } from '../utils/MathUtils';

export class World implements IWorld {
    public chunkSize: number;
    public memory: BlockMemory;
    
    // ID Maps
    private idToIndex: Map<string, number> = new Map();
    private indexToId: Map<number, string> = new Map();
    
    // Spatial Hash: "cx,cy" -> index[]
    private chunks: Map<string, number[]> = new Map();

    constructor(chunkSize: number = 128) {
        this.chunkSize = chunkSize;
        this.memory = new BlockMemory(100000);
    }

    // ==========================================
    // Core Logic
    // ==========================================

    addBlock(block: PixelBlock): number {
        const index = this.memory.add(block);
        this.idToIndex.set(block.id, index);
        this.indexToId.set(index, block.id);
        this.addToSpatialIndex(index, block.x, block.y, block.w, block.h);
        return index;
    }

    removeBlockById(id: string): boolean {
        const index = this.idToIndex.get(id);
        if (index === undefined) return false;
        if (this.memory.w[index] === 0) return false;

        const x = this.memory.x[index];
        const y = this.memory.y[index];
        const w = this.memory.w[index];
        const h = this.memory.h[index];

        this.memory.remove(index);
        
        this.idToIndex.delete(id);
        this.indexToId.delete(index);
        this.removeFromSpatialIndex(index, x, y, w, h);
        
        return true;
    }

    updateBlockProps(id: string, props: Partial<PixelBlock>): boolean {
        const index = this.idToIndex.get(id);
        if (index === undefined) return false;

        const currentX = this.memory.x[index];
        const currentY = this.memory.y[index];
        const currentW = this.memory.w[index];
        const currentH = this.memory.h[index];

        const newX = props.x ?? currentX;
        const newY = props.y ?? currentY;
        const newW = props.w ?? currentW;
        const newH = props.h ?? currentH;

        const isSpatialChange = (newX !== currentX || newY !== currentY || newW !== currentW || newH !== currentH);

        if (isSpatialChange) {
            this.removeFromSpatialIndex(index, currentX, currentY, currentW, currentH);
            if (props.x !== undefined) this.memory.x[index] = props.x;
            if (props.y !== undefined) this.memory.y[index] = props.y;
            if (props.w !== undefined) this.memory.w[index] = props.w;
            if (props.h !== undefined) this.memory.h[index] = props.h;
            this.addToSpatialIndex(index, newX, newY, newW, newH);
        }

        if (props.color !== undefined) {
             this.memory.color[index] = parseInt(props.color.replace('#', ''), 16);
        }
        if (props.type !== undefined) {
             this.memory.type[index] = props.type === 'image' ? 1 : (props.type === 'nested' ? 2 : 0);
        }

        return true;
    }

    // ==========================================
    // Optimization: Defragmentation
    // ==========================================

    /**
     * 执行内存整理，消除碎片，并重建所有索引
     */
    public defragment() {
        // 1. Memory Level Compact
        const moveMap = this.memory.compact();

        // Check if anything moved (index 0 still at 0, and sizes match)
        if (moveMap.size === this.memory.count && moveMap.get(0) === 0) {
             return; // Already clean
        }

        // 2. Rebuild ID Maps
        const newIdToIndex = new Map<string, number>();
        const newIndexToId = new Map<number, string>();

        for (const [oldIdx, newIdx] of moveMap) {
            const id = this.indexToId.get(oldIdx);
            if (id) {
                newIdToIndex.set(id, newIdx);
                newIndexToId.set(newIdx, id);
            }
        }
        this.idToIndex = newIdToIndex;
        this.indexToId = newIndexToId;

        // 3. Rebuild Spatial Index
        this.chunks.clear();
        const count = this.memory.count;
        for (let i = 0; i < count; i++) {
            this.addToSpatialIndex(
                i, 
                this.memory.x[i], 
                this.memory.y[i], 
                this.memory.w[i], 
                this.memory.h[i]
            );
        }
        
        console.log(`[World] Defragmented. Active blocks: ${count}`);
    }

    // ==========================================
    // Serialization Support
    // ==========================================

    toBinary(): ArrayBuffer { return BinaryCodec.encode(this.memory); }
    
    loadFromBinary(buffer: ArrayBuffer) {
        BinaryCodec.decode(buffer, this);
    }

    /**
     * Called by BinaryCodec after loading raw memory
     */
    public rebuildIndices() {
        this.idToIndex.clear();
        this.indexToId.clear();
        this.chunks.clear();

        const count = this.memory.count;
        console.log(`[World] Rebuilding indices for ${count} blocks...`);

        for (let i = 0; i < count; i++) {
            // Generate new IDs for loaded blocks (since binary doesn't store transient UUIDs)
            const id = MathUtils.generateId(); 
            this.idToIndex.set(id, i);
            this.indexToId.set(i, id);

            this.addToSpatialIndex(
                i,
                this.memory.x[i],
                this.memory.y[i],
                this.memory.w[i],
                this.memory.h[i]
            );
        }
    }

    // ==========================================
    // Queries (Standard)
    // ==========================================

    getBlockById(id: string): PixelBlock | undefined {
        const index = this.idToIndex.get(id);
        if (index === undefined) return undefined;
        const block = this.memory.getPixelBlock(index);
        if (block) block.id = id;
        return block || undefined;
    }
    
    getIndexById(id: string): number | undefined {
        return this.idToIndex.get(id);
    }

    getBlockAt(x: number, y: number): PixelBlock | null {
        const indices = this.getIndicesAt(x, y);
        if (!indices) return null;

        for (let i = indices.length - 1; i >= 0; i--) {
            const idx = indices[i];
            if (this.memory.w[idx] === 0) continue;

            if (x >= this.memory.x[idx] && x < this.memory.x[idx] + this.memory.w[idx] &&
                y >= this.memory.y[idx] && y < this.memory.y[idx] + this.memory.h[idx]) {
                
                const block = this.memory.getPixelBlock(idx);
                const realId = this.indexToId.get(idx);
                if (block && realId) {
                    block.id = realId;
                    return block;
                }
            }
        }
        return null;
    }

    queryIndicesInRect(l: number, t: number, r: number, b: number): number[] {
        const results: number[] = [];
        const seen = new Set<number>();
        const startCX = Math.floor(l / this.chunkSize);
        const startCY = Math.floor(t / this.chunkSize);
        const endCX = Math.floor(r / this.chunkSize);
        const endCY = Math.floor(b / this.chunkSize);

        for (let cx = startCX; cx <= endCX; cx++) {
            for (let cy = startCY; cy <= endCY; cy++) {
                const indices = this.chunks.get(`${cx},${cy}`);
                if (!indices) continue;
                for (let i = 0; i < indices.length; i++) {
                    const idx = indices[i];
                    if (seen.has(idx)) continue;
                    if (this.memory.w[idx] === 0) continue;
                    
                    const bx = this.memory.x[idx];
                    const bw = this.memory.w[idx];
                    if (bx >= r || bx + bw <= l) continue;
                    const by = this.memory.y[idx];
                    const bh = this.memory.h[idx];
                    if (by >= b || by + bh <= t) continue;
                    
                    results.push(idx);
                    seen.add(idx);
                }
            }
        }
        return results;
    }

    queryBlocksInRect(l: number, t: number, r: number, b: number): PixelBlock[] {
        const indices = this.queryIndicesInRect(l, t, r, b);
        return indices.map(idx => {
            const b = this.memory.getPixelBlock(idx)!;
            const realId = this.indexToId.get(idx);
            if(realId) b.id = realId;
            return b;
        });
    }

    isRegionOccupied(x: number, y: number, w: number, h: number, ignoreIds?: Set<string>): boolean {
        const indices = this.queryIndicesInRect(x+0.1, y+0.1, x+w-0.1, y+h-0.1);
        if (indices.length === 0) return false;
        
        if (ignoreIds) {
            return indices.some(idx => {
                const id = this.indexToId.get(idx);
                return id ? !ignoreIds.has(id) : true;
            });
        }
        return true;
    }
    
    isPointOccupied(x: number, y: number): boolean {
        return this.getBlockAt(x, y) !== null;
    }

    // --- Spatial Helpers ---
    private getIndicesAt(x: number, y: number): number[] | undefined {
        const cx = Math.floor(x / this.chunkSize);
        const cy = Math.floor(y / this.chunkSize);
        return this.chunks.get(`${cx},${cy}`);
    }
    
    private addToSpatialIndex(idx: number, x: number, y: number, w: number, h: number) {
        const startCX = Math.floor(x / this.chunkSize);
        const startCY = Math.floor(y / this.chunkSize);
        const endCX = Math.floor((x + w - 0.1) / this.chunkSize);
        const endCY = Math.floor((y + h - 0.1) / this.chunkSize);
        
        for(let cx=startCX; cx<=endCX; cx++) {
            for(let cy=startCY; cy<=endCY; cy++) {
                const key = `${cx},${cy}`;
                if (!this.chunks.has(key)) this.chunks.set(key, []);
                this.chunks.get(key)!.push(idx);
            }
        }
    }
    
    private removeFromSpatialIndex(idx: number, x: number, y: number, w: number, h: number) {
        const startCX = Math.floor(x / this.chunkSize);
        const startCY = Math.floor(y / this.chunkSize);
        const endCX = Math.floor((x + w - 0.1) / this.chunkSize);
        const endCY = Math.floor((y + h - 0.1) / this.chunkSize);
        
        for(let cx=startCX; cx<=endCX; cx++) {
            for(let cy=startCY; cy<=endCY; cy++) {
                const key = `${cx},${cy}`;
                const list = this.chunks.get(key);
                if (list) {
                    const i = list.indexOf(idx);
                    if (i > -1) list.splice(i, 1);
                }
            }
        }
    }

    // Stub for standard JSON
    toJSON(): string { return ''; }
    fromJSON(s: string) {}
    clear() {
        this.memory.clear();
        this.chunks.clear();
        this.idToIndex.clear();
        this.indexToId.clear();
    }
}