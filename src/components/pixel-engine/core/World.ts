// src/engine/core/World.ts
import { PixelBlock } from '../types';

export class World {
  // 正向索引：Chunk Key -> 方块列表
  private chunks: Map<string, PixelBlock[]> = new Map();
  
  // [New] 反向索引：Block ID -> 它所在的 Chunk Key 集合 (用于快速精确删除)
  private blockToChunksMap: Map<string, Set<string>> = new Map();

  public chunkSize: number;

  constructor(chunkSize: number = 128) {
    this.chunkSize = chunkSize;
  }

  // 获取某个坐标点所在的 Chunk Key
  private getChunkKey(wx: number, wy: number): string {
    const cx = Math.floor(wx / this.chunkSize);
    const cy = Math.floor(wy / this.chunkSize);
    return `${cx},${cy}`;
  }

  /**
   * [Heavy Refactor] 添加方块
   * 严谨实现：计算方块覆盖的所有 Chunk，并分别存入。
   */
  addBlock(block: PixelBlock) {
    // 1. 计算方块覆盖的 Chunk 范围 (左上角到右下角)
    const startCX = Math.floor(block.x / this.chunkSize);
    const startCY = Math.floor(block.y / this.chunkSize);
    // 使用 ceil 确保包含右边界和下边界所在的 chunk
    // 减个极小值防止刚好压线时多算一个 chunk
    const endCX = Math.floor((block.x + block.w - 0.01) / this.chunkSize);
    const endCY = Math.floor((block.y + block.h - 0.01) / this.chunkSize);

    const involvedChunkKeys = new Set<string>();

    // 2. 遍历覆盖的所有 Chunk
    for (let cx = startCX; cx <= endCX; cx++) {
      for (let cy = startCY; cy <= endCY; cy++) {
        const key = `${cx},${cy}`;
        involvedChunkKeys.add(key);

        // 将方块加入该 Chunk
        if (!this.chunks.has(key)) {
          this.chunks.set(key, []);
        }
        // 商业级优化：这里可以检查是否已存在，但在当前逻辑下新建的 id 都是唯一的，暂不需要
        this.chunks.get(key)!.push(block);
      }
    }

    // 3. 记录反向索引，方便删除
    this.blockToChunksMap.set(block.id, involvedChunkKeys);
  }

  /**
   * [Heavy Refactor] 精确删除方块
   * 利用反向索引，快速找到并清理所有涉及的 Chunk。
   */
  removeBlockById(id: string): boolean {
    const chunkKeys = this.blockToChunksMap.get(id);
    if (!chunkKeys) return false; // 不存在

    let removed = false;

    // 遍历该方块所在的所有 Chunk
    for (const key of chunkKeys) {
      const blocks = this.chunks.get(key);
      if (blocks) {
        const index = blocks.findIndex(b => b.id === id);
        if (index !== -1) {
          blocks.splice(index, 1);
          removed = true;
          // 如果 Chunk 空了，可以清理掉 Map entry 节省内存
          if (blocks.length === 0) {
            this.chunks.delete(key);
          }
        }
      }
    }

    // 清理反向索引
    this.blockToChunksMap.delete(id);
    return removed;
  }

  /**
   * 获取指定位置的顶层方块 (橡皮擦定位用)
   * 这个逻辑不变，只需查找鼠标点所在的那个 Chunk 即可
   */
  getBlockAt(x: number, y: number): PixelBlock | null {
    const key = this.getChunkKey(x, y);
    const chunk = this.chunks.get(key);
    if (!chunk) return null;

    // 倒序查找 (Z-Order)
    for (let i = chunk.length - 1; i >= 0; i--) {
      const b = chunk[i];
      // 精确的 AABB 碰撞检测
      if (x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.h) {
        return b;
      }
    }
    return null;
  }

  /**
   * [Heavy Refactor] 查询视野内的方块
   * 严谨实现：必须进行去重 (Deduplication)。
   */
  queryBlocksInRect(left: number, top: number, right: number, bottom: number): PixelBlock[] {
    const results: PixelBlock[] = [];
    // [New] 用于去重的 Set，存储已加入结果的 Block ID
    const seenIds = new Set<string>();

    // 计算视野覆盖的 Chunk 范围
    // floor 包含左/上边界，ceil 包含右/下边界
    const startCX = Math.floor(left / this.chunkSize);
    const startCY = Math.floor(top / this.chunkSize);
    const endCX = Math.floor(right / this.chunkSize);
    const endCY = Math.floor(bottom / this.chunkSize);

    // 遍历视野内的 Chunk
    for (let x = startCX; x <= endCX; x++) {
      for (let y = startCY; y <= endCY; y++) {
        const key = `${x},${y}`;
        const chunkData = this.chunks.get(key);
        if (chunkData) {
            // 遍历 Chunk 内的所有方块
            for (const block of chunkData) {
                // [New] 核心去重逻辑：如果没见过这个ID，才加入结果
                if (!seenIds.has(block.id)) {
                    results.push(block);
                    seenIds.add(block.id);
                }
            }
        }
      }
    }
    return results;
  }

  // --- 序列化保持不变 ---

  toJSON(): string {
    // 由于方块在多个 Chunk 中重复，序列化时也需要去重
    const uniqueBlocks = new Map<string, PixelBlock>();
    this.chunks.forEach((blocks) => {
        blocks.forEach(b => uniqueBlocks.set(b.id, b));
    });
    return JSON.stringify(Array.from(uniqueBlocks.values()));
  }

  fromJSON(json: string) {
    try {
      this.clear();
      const blocks: PixelBlock[] = JSON.parse(json);
      if (Array.isArray(blocks)) {
        // 使用新的 addBlock 逻辑重新构建索引
        blocks.forEach(b => this.addBlock(b));
      }
      console.log(`[World] Loaded ${blocks.length} unique blocks.`);
    } catch (e) {
      console.error('Failed to load world data', e);
    }
  }

  clear() {
    this.chunks.clear();
    this.blockToChunksMap.clear();
  }
}