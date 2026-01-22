import { IWorld, PixelBlock } from '../types';
import { MathUtils } from '../utils/MathUtils';

/**
 * [Core] SpatialHashWorld
 * * 一个高性能的、基于空间哈希（Spatial Hashing）的世界管理系统。
 * * 核心设计哲学：
 * 1. 空间换时间：使用 Map 建立坐标索引，将区域查询复杂度从 O(N) 降至 O(K)，K为视野内Chunk数。
 * 2. 双重索引：同时维护 `ID -> Block` 和 `Coordinate -> Block` 两套索引，确保增删改查均为 O(1)。
 * 3. 稀疏矩阵：只存储有数据的区域，支持无限大的画布而不会浪费内存。
 */
export class World implements IWorld {
    // [Index 1] 空间索引：ChunkKey -> Block列表
    // 使用 Map 而不是二维数组，支持无限世界且节省稀疏区域内存
    private chunks: Map<string, PixelBlock[]> = new Map();

    // [Index 2] 实体索引：BlockID -> ChunkKey集合
    // 用于 O(1) 时间内通过 ID 找到方块所在的 Chunks，从而快速删除
    private blockToChunkKeys: Map<string, Set<string>> = new Map();

    // 空间分块大小 (像素)
    // 128px 是个经验值，既不太小导致 Map 膨胀，也不太大导致单个 Chunk 内遍历慢
    public chunkSize: number;

    constructor(chunkSize: number = 128) {
        this.chunkSize = chunkSize;
    }

    // --- 核心算法：坐标哈希 ---

    /**
     * 将世界坐标转换为 Chunk 坐标
     */
    private getChunkKey(x: number, y: number): string {
        const cx = Math.floor(x / this.chunkSize);
        const cy = Math.floor(y / this.chunkSize);
        return `${cx},${cy}`;
    }

    // --- 增删改查 (CRUD) ---

    /**
     * 添加方块 (O(1) ~ O(C), C为方块跨越的Chunk数)
     */
    addBlock(block: PixelBlock) {
        // 1. 计算方块覆盖了哪些 Chunk
        // 大多数像素方块只占 1 个 Chunk，但大矩形可能跨越多个
        const startCX = Math.floor(block.x / this.chunkSize);
        const startCY = Math.floor(block.y / this.chunkSize);
        const endCX = Math.floor((block.x + block.w - MathUtils.EPSILON) / this.chunkSize);
        const endCY = Math.floor((block.y + block.h - MathUtils.EPSILON) / this.chunkSize);

        const involvedChunkKeys = new Set<string>();

        // 2. 将方块注册到所有涉及的 Chunk 中
        for (let cx = startCX; cx <= endCX; cx++) {
            for (let cy = startCY; cy <= endCY; cy++) {
                const key = `${cx},${cy}`;
                involvedChunkKeys.add(key);

                let chunk = this.chunks.get(key);
                if (!chunk) {
                    chunk = [];
                    this.chunks.set(key, chunk);
                }
                
                // 放入该 Chunk 的数据桶
                chunk.push(block);
            }
        }

        // 3. 记录反向索引，方便后续删除
        this.blockToChunkKeys.set(block.id, involvedChunkKeys);
    }

    /**
     * 根据 ID 删除方块 (O(1) ~ O(C))
     */
    removeBlockById(id: string): boolean {
        // 1. 通过 ID 索引直接找到它所在的 Chunks
        const chunkKeys = this.blockToChunkKeys.get(id);
        if (!chunkKeys) return false;

        // 2. 从所有涉及的 Chunk 中移除该 Block
        for (const key of chunkKeys) {
            const chunk = this.chunks.get(key);
            if (chunk) {
                // 使用 filter 或 splice 移除
                // 由于 Chunk 内元素通常不多，findIndex 很快
                const index = chunk.findIndex(b => b.id === id);
                if (index !== -1) {
                    // [Performance] 这种删除是 O(M)，M 为 Chunk 内方块数
                    // 如果追求极致，可以使用 "Swap and Pop" (将最后一个元素移到被删位置)，但会打乱渲染顺序(Z-index)
                    chunk.splice(index, 1);
                }

                // 如果 Chunk 空了，回收内存
                if (chunk.length === 0) {
                    this.chunks.delete(key);
                }
            }
        }

        // 3. 清除索引
        this.blockToChunkKeys.delete(id);
        return true;
    }

    /**
     * 点查询：获取某个坐标下的方块 (O(1))
     * 用于鼠标拾取、碰撞检测
     */
    getBlockAt(x: number, y: number): PixelBlock | null {
        const key = this.getChunkKey(x, y);
        const chunk = this.chunks.get(key);
        if (!chunk) return null;

        // 逆序遍历，确保获取到的是最上层（Z-Index最大或最后添加）的方块
        for (let i = chunk.length - 1; i >= 0; i--) {
            const b = chunk[i];
            // 精确 AABB 测试
            if (x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.h) {
                return b;
            }
        }
        return null;
    }

    // --- 核心渲染算法 ---

    /**
     * 区域查询：获取矩形范围内的所有方块
     * 渲染器的核心依赖，性能至关重要。
     */
    queryBlocksInRect(left: number, top: number, right: number, bottom: number): PixelBlock[] {
        const results: PixelBlock[] = [];
        // 使用 Set 防止大方块跨越 Chunk 时被重复添加
        const seenIds = new Set<string>();

        const startCX = Math.floor(left / this.chunkSize);
        const startCY = Math.floor(top / this.chunkSize);
        const endCX = Math.floor(right / this.chunkSize);
        const endCY = Math.floor(bottom / this.chunkSize);

        // 只遍历视野范围内的 Chunk
        for (let cx = startCX; cx <= endCX; cx++) {
            for (let cy = startCY; cy <= endCY; cy++) {
                const key = `${cx},${cy}`;
                const chunk = this.chunks.get(key);
                
                if (chunk) {
                    // [Optimization] 使用标准 for 循环，比 forEach 快
                    for (let i = 0; i < chunk.length; i++) {
                        const b = chunk[i];
                        
                        // 1. 去重检查 (对于跨 Chunk 的方块)
                        if (seenIds.has(b.id)) continue;

                        // 2. AABB 精确剔除 (Culling)
                        // Chunk 在视野内，不代表 Chunk 里的方块一定在视野内
                        // 这一步确保了渲染器不会处理任何屏幕外的像素
                        if (b.x < right && b.x + b.w > left && 
                            b.y < bottom && b.y + b.h > top) {
                            
                            results.push(b);
                            seenIds.add(b.id);
                        }
                    }
                }
            }
        }
        return results;
    }

    // --- 序列化与数据管理 ---

    toJSON(): string {
        // 由于方块可能存在于多个 Chunk，我们需要去重后再序列化
        const uniqueBlocks = new Map<string, PixelBlock>();
        
        for (const chunk of this.chunks.values()) {
            for (const block of chunk) {
                uniqueBlocks.set(block.id, block);
            }
        }
        
        return JSON.stringify(Array.from(uniqueBlocks.values()));
    }

    fromJSON(json: string) {
        try {
            this.clear();
            const blocks: PixelBlock[] = JSON.parse(json);
            if (Array.isArray(blocks)) {
                // 批量添加
                blocks.forEach(b => this.addBlock(b));
            }
            console.log(`[World] Loaded ${blocks.length} blocks via SpatialHash.`);
        } catch (e) {
            console.error('[World] Failed to load JSON', e);
        }
    }

    clear() {
        this.chunks.clear();
        this.blockToChunkKeys.clear();
    }
}