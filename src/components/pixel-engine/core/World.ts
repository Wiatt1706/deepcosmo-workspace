import { IWorld, PixelBlock } from '../types';
import { MathUtils } from '../utils/MathUtils';

/**
 * [Core] SpatialHashWorld
 * 一个高性能的、基于空间哈希（Spatial Hashing）的世界管理系统。
 * * 核心特性：
 * 1. 空间索引 (Spatial Index): 将世界划分为 Chunk，只遍历视野内的方块。
 * 2. ID 索引 (ID Index): 支持 O(1) 时间复杂度根据 ID 找回方块 (用于 Undo/Redo)。
 * 3. 统一物理 (Unified Physics): 提供统一的碰撞检测 API。
 */
export class World implements IWorld {
    // [Index 1] 空间索引：ChunkKey ("x,y") -> Block列表
    // 用于区域查询和渲染剔除
    private chunks: Map<string, PixelBlock[]> = new Map();

    // [Index 2] 实体反向索引：BlockID -> ChunkKey集合
    // 用于快速删除方块（知道它跨越了哪些 Chunk）
    private blockToChunkKeys: Map<string, Set<string>> = new Map();

    // [Index 3] 直接 ID 索引：BlockID -> Block对象
    // [New] 用于撤销/重做时精确找回对象，以及快速存在性检查
    private idMap: Map<string, PixelBlock> = new Map();

    public chunkSize: number;

    constructor(chunkSize: number = 128) {
        this.chunkSize = chunkSize;
    }

    // --- 内部算法：坐标哈希 ---
    private getChunkKey(x: number, y: number): string {
        const cx = Math.floor(x / this.chunkSize);
        const cy = Math.floor(y / this.chunkSize);
        return `${cx},${cy}`;
    }

    // --- CRUD 操作 ---

    public addBlock(block: PixelBlock) {
        // 1. 更新 ID 索引
        this.idMap.set(block.id, block);

        // 2. 计算方块跨越的 Chunk 范围
        const startCX = Math.floor(block.x / this.chunkSize);
        const startCY = Math.floor(block.y / this.chunkSize);
        // 使用 EPSILON 防止刚好在边界上的方块被算入下一个 Chunk
        const endCX = Math.floor((block.x + block.w - MathUtils.EPSILON) / this.chunkSize);
        const endCY = Math.floor((block.y + block.h - MathUtils.EPSILON) / this.chunkSize);

        const involvedChunkKeys = new Set<string>();

        // 3. 将方块注册到所有涉及的 Chunk 中
        for (let cx = startCX; cx <= endCX; cx++) {
            for (let cy = startCY; cy <= endCY; cy++) {
                const key = `${cx},${cy}`;
                involvedChunkKeys.add(key);
                
                let chunk = this.chunks.get(key);
                if (!chunk) {
                    chunk = [];
                    this.chunks.set(key, chunk);
                }
                chunk.push(block);
            }
        }

        // 4. 记录反向索引
        this.blockToChunkKeys.set(block.id, involvedChunkKeys);
    }

    public removeBlockById(id: string): boolean {
        // 1. 检查是否存在
        const block = this.idMap.get(id);
        if (!block) return false;

        // 2. 从 ID 索引移除
        this.idMap.delete(id);

        // 3. 从空间索引移除
        const chunkKeys = this.blockToChunkKeys.get(id);
        if (chunkKeys) {
            for (const key of chunkKeys) {
                const chunk = this.chunks.get(key);
                if (chunk) {
                    const index = chunk.findIndex(b => b.id === id);
                    if (index !== -1) {
                        chunk.splice(index, 1);
                    }
                    // 如果 Chunk 空了，清理内存
                    if (chunk.length === 0) {
                        this.chunks.delete(key);
                    }
                }
            }
            // 4. 清除反向索引
            this.blockToChunkKeys.delete(id);
        }
        return true;
    }

    // [New] 关键 API：通过 ID 获取方块
    // SelectionSystem 在恢复快照时严重依赖此方法
    public getBlockById(id: string): PixelBlock | undefined {
        return this.idMap.get(id);
    }

    public getBlockAt(x: number, y: number): PixelBlock | null {
        const key = this.getChunkKey(x, y);
        const chunk = this.chunks.get(key);
        if (!chunk) return null;

        // 逆序遍历，确保点选到的是最上层（最后添加）的方块
        for (let i = chunk.length - 1; i >= 0; i--) {
            const b = chunk[i];
            if (x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.h) {
                return b;
            }
        }
        return null;
    }

    // --- 核心查询与物理 API ---

    public queryBlocksInRect(left: number, top: number, right: number, bottom: number): PixelBlock[] {
        const results: PixelBlock[] = [];
        const seenIds = new Set<string>(); // 去重

        const startCX = Math.floor(left / this.chunkSize);
        const startCY = Math.floor(top / this.chunkSize);
        const endCX = Math.floor(right / this.chunkSize);
        const endCY = Math.floor(bottom / this.chunkSize);

        for (let cx = startCX; cx <= endCX; cx++) {
            for (let cy = startCY; cy <= endCY; cy++) {
                const chunk = this.chunks.get(`${cx},${cy}`);
                if (chunk) {
                    for (let i = 0; i < chunk.length; i++) {
                        const b = chunk[i];
                        if (seenIds.has(b.id)) continue;

                        // AABB 碰撞检测
                        if (b.x < right && b.x + b.w > left && b.y < bottom && b.y + b.h > top) {
                            results.push(b);
                            seenIds.add(b.id);
                        }
                    }
                }
            }
        }
        return results;
    }

    /**
     * [Unified API] 检测区域是否被占用
     * @param ignoreIds 可选：忽略特定的方块ID（用于移动自身时的检测）
     */
    public isRegionOccupied(x: number, y: number, w: number, h: number, ignoreIds?: Set<string>): boolean {
        // 使用 epsilon (0.1) 微微内缩检测范围，避免相邻方块因浮点精度问题产生误判
        const epsilon = 0.1;
        const blocks = this.queryBlocksInRect(
            x + epsilon, 
            y + epsilon, 
            x + w - epsilon, 
            y + h - epsilon
        );
        
        if (blocks.length === 0) return false;
        
        if (ignoreIds) {
            // 如果存在方块，且该方块不在忽略列表中，则视为真正的物理碰撞
            return blocks.some(b => !ignoreIds.has(b.id));
        }
        return true;
    }

    /**
     * [Unified API] 检测单点是否被占用
     */
    public isPointOccupied(x: number, y: number): boolean {
        return this.getBlockAt(x, y) !== null;
    }

    // --- 序列化与清理 ---

    toJSON(): string {
        // 直接使用 idMap.values() 即可获取所有不重复的方块
        return JSON.stringify(Array.from(this.idMap.values()));
    }

    fromJSON(json: string) {
        try {
            this.clear();
            const blocks: PixelBlock[] = JSON.parse(json);
            if (Array.isArray(blocks)) {
                blocks.forEach(b => this.addBlock(b));
            }
            console.log(`[World] Loaded ${blocks.length} blocks.`);
        } catch (e) {
            console.error('[World] Failed to load JSON', e);
        }
    }

    clear() {
        this.chunks.clear();
        this.blockToChunkKeys.clear();
        this.idMap.clear();
    }
}