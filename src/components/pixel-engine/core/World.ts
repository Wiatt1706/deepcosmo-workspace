// src/engine/core/World.ts
import { BlockMemory } from './BlockMemory';
import { PixelBlock, IWorld } from '../types';
import { BinaryCodec } from '../utils/BinaryCodec';

export class World implements IWorld {
    public chunkSize: number;
    public memory: BlockMemory;
    
    // [Core Fix] ID 映射表：UUIDString -> MemoryIndex
    // 这是连接稳定业务逻辑与底层动态内存的桥梁
    private idToIndex: Map<string, number> = new Map();
    
    private chunks: Map<string, number[]> = new Map();

    constructor(chunkSize: number = 128) {
        this.chunkSize = chunkSize;
        this.memory = new BlockMemory(100000);
    }

    addBlock(block: PixelBlock): number {
        // 1. 写入内存
        const index = this.memory.add(block);
        
        // 2. [Fixed] 记录映射
        // 如果 block.id 为空或冲突，这里应该处理，但通常由 Tool 保证唯一
        this.idToIndex.set(block.id, index);
        
        // 3. 空间索引
        this.addToSpatialIndex(index, block.x, block.y, block.w, block.h);
        
        return index;
    }

    removeBlockById(id: string): boolean {
        // [Fixed] 通过 Map 查找 Index，不再 parseInt
        const index = this.idToIndex.get(id);
        if (index === undefined) return false;
        
        // 软删除检查
        if (this.memory.w[index] === 0) return false;

        const x = this.memory.x[index];
        const y = this.memory.y[index];
        const w = this.memory.w[index];
        const h = this.memory.h[index];

        // 内存移除
        this.memory.remove(index);
        
        // 清理索引
        this.idToIndex.delete(id);
        this.removeFromSpatialIndex(index, x, y, w, h);
        return true;
    }

    getBlockById(id: string): PixelBlock | undefined {
        const index = this.idToIndex.get(id);
        if (index === undefined) return undefined;
        return this.memory.getPixelBlock(index) || undefined;
    }
    
    // [New] 快速获取 Index (供 Layer 使用)
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
                // 此时返回的对象包含正确的 id (从 getPixelBlock 中获取不到 string ID? Wait)
                // BlockMemory.getPixelBlock 返回的是 index string。
                // 我们需要把它修正为真实 UUID。
                // *性能权衡*：为了 getBlockAt 正确，BlockMemory 需要存 UUID 吗？
                // 为了极致性能，BlockMemory 不存 UUID 字符串。
                // 只有 getBlockById 这种路径是通的。
                
                // 反向查找？太慢。
                // *解决方案*：getBlockAt 返回的对象，其 ID 暂时只能是 IndexString。
                // 外部如果需要 UUID，必须通过 queryIndicesInRect -> filter -> ???
                
                // 实际上，为了交互（选中），我们需要 UUID。
                // 难道必须在 BlockMemory 里存 UUID？
                // 为了百万级商业项目，我们在 BlockMemory 加一个 `idPalette` 吗？
                // 或者，我们在 World 里反向查找？
                
                // 鉴于点击频率低，我们在 idToIndex 中遍历查找是可接受的，或者维护 indexToId。
                // 为了稳健，我们维护双向映射？或者简单点：
                // 让 BlockMemory 不存 ID，但是 World.addBlock 时，把 index->id 存入一个 Map<number, string>？
                // 是的，indexToId Map 是必要的。
                const realId = this.indexToId.get(idx);
                const block = this.memory.getPixelBlock(idx);
                if (block && realId) block.id = realId; // 修正 ID
                return block;
            }
        }
        return null;
    }
    
    // [New] Index -> ID 映射 (辅助 getBlockAt)
    private indexToId: Map<number, string> = new Map();

    // 覆盖 addBlock 以维护双向映射
    // 注意：上面的 addBlock 需要修改
    
    // ----------- 修正后的 add/remove (维护 indexToId) -----------
    
    /* 重新实现 addBlock */
    addBlock_Rev(block: PixelBlock): number {
        const index = this.memory.add(block);
        this.idToIndex.set(block.id, index);
        this.indexToId.set(index, block.id); // [New]
        this.addToSpatialIndex(index, block.x, block.y, block.w, block.h);
        return index;
    }
    
    /* 重新实现 removeBlockById */
    removeBlockById_Rev(id: string): boolean {
        const index = this.idToIndex.get(id);
        if (index === undefined) return false;
        
        if (this.memory.w[index] === 0) return false;
        const x = this.memory.x[index];
        const y = this.memory.y[index];
        const w = this.memory.w[index];
        const h = this.memory.h[index];

        this.memory.remove(index);
        
        this.idToIndex.delete(id);
        this.indexToId.delete(index); // [New]
        this.removeFromSpatialIndex(index, x, y, w, h);
        return true;
    }

    public queryIndicesInRect(l: number, t: number, r: number, b: number): number[] {
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

    // ... (isRegionOccupied, isPointOccupied, SpatialHelpers 保持不变) ...
    // 为了节省篇幅，这里复用之前的逻辑，记得把 addBlock/remove 替换为 _Rev 版本
    
    // [Merged Implementation]
    
    // --- Spatial Hash Helpers ---
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

    toBinary(): ArrayBuffer { return BinaryCodec.encode(this.memory); }
    fromBinary(buffer: ArrayBuffer) { 
        this.clear(); 
        BinaryCodec.decode(buffer, this); 
    }
    toJSON(): string { return ''; }
    fromJSON(s: string) {}

    clear() {
        this.memory.clear();
        this.chunks.clear();
        this.idToIndex.clear();
        this.indexToId.clear();
    }
    
    isRegionOccupied(x: number, y: number, w: number, h: number, ignoreIds?: Set<string>): boolean {
        const indices = this.queryIndicesInRect(x+0.1, y+0.1, x+w-0.1, y+h-0.1);
        if (indices.length === 0) return false;
        if (ignoreIds) {
            // 需要把 Index 转回 ID 才能对比
            return indices.some(idx => {
                const id = this.indexToId.get(idx);
                return id ? !ignoreIds.has(id) : true;
            });
        }
        return true;
    }
    isPointOccupied(x: number, y: number): boolean { return this.getBlockAt(x, y) !== null; }
}

// 修正：将 _Rev 方法体替换到主方法中
World.prototype.addBlock = World.prototype.addBlock_Rev;
World.prototype.removeBlockById = World.prototype.removeBlockById_Rev;