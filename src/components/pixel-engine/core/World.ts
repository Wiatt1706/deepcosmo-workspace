// src/engine/core/World.ts
import { PixelBlock } from '../types';
import { MathUtils } from '../utils/MathUtils';

export class World {
  // 正向索引：Chunk Key -> 方块列表
  private chunks: Map<string, PixelBlock[]> = new Map();
  
  // 反向索引：Block ID -> 它所在的 Chunk Key 集合
  private blockToChunksMap: Map<string, Set<string>> = new Map();

  public chunkSize: number;

  constructor(chunkSize: number = 128) {
    this.chunkSize = chunkSize;
  }

  private getChunkKey(cx: number, cy: number): string {
    return `${cx},${cy}`;
  }

  /**
   * [FIX] 优化后的添加方块逻辑
   * 使用 EPSILON 处理边界，防止方块刚好在分界线上时被错误分配
   */
  addBlock(block: PixelBlock) {
    // 1. 计算 Chunk 覆盖范围
    const startCX = Math.floor(block.x / this.chunkSize);
    const startCY = Math.floor(block.y / this.chunkSize);
    
    // [FIX] 使用 EPSILON 替代 0.01，更加严谨
    const endCX = Math.floor((block.x + block.w - MathUtils.EPSILON) / this.chunkSize);
    const endCY = Math.floor((block.y + block.h - MathUtils.EPSILON) / this.chunkSize);

    const involvedChunkKeys = new Set<string>();

    for (let cx = startCX; cx <= endCX; cx++) {
      for (let cy = startCY; cy <= endCY; cy++) {
        const key = this.getChunkKey(cx, cy);
        involvedChunkKeys.add(key);

        if (!this.chunks.has(key)) {
          this.chunks.set(key, []);
        }
        
        // [FIX] 深度防御：防止 ID 重复导致的逻辑错误
        const chunkBlocks = this.chunks.get(key)!;
        if (!chunkBlocks.find(b => b.id === block.id)) {
            chunkBlocks.push(block);
        }
      }
    }

    this.blockToChunksMap.set(block.id, involvedChunkKeys);
  }

  removeBlockById(id: string): boolean {
    const chunkKeys = this.blockToChunksMap.get(id);
    if (!chunkKeys) return false;

    let removed = false;

    for (const key of chunkKeys) {
      const blocks = this.chunks.get(key);
      if (blocks) {
        const index = blocks.findIndex(b => b.id === id);
        if (index !== -1) {
          blocks.splice(index, 1);
          removed = true;
          // [FIX] 及时清理空 Chunk，防止内存泄漏
          if (blocks.length === 0) {
            this.chunks.delete(key);
          }
        }
      }
    }

    this.blockToChunksMap.delete(id);
    return removed;
  }

  getBlockAt(x: number, y: number): PixelBlock | null {
    const cx = Math.floor(x / this.chunkSize);
    const cy = Math.floor(y / this.chunkSize);
    const key = this.getChunkKey(cx, cy);
    
    const chunk = this.chunks.get(key);
    if (!chunk) return null;

    // 倒序查找 (Z-Order)
    for (let i = chunk.length - 1; i >= 0; i--) {
      const b = chunk[i];
      // [FIX] 严谨的 AABB 碰撞检测
      if (x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.h) {
        return b;
      }
    }
    return null;
  }

  queryBlocksInRect(left: number, top: number, right: number, bottom: number): PixelBlock[] {
    const results: PixelBlock[] = [];
    const seenIds = new Set<string>();

    const startCX = Math.floor(left / this.chunkSize);
    const startCY = Math.floor(top / this.chunkSize);
    const endCX = Math.floor(right / this.chunkSize);
    const endCY = Math.floor(bottom / this.chunkSize);

    for (let cx = startCX; cx <= endCX; cx++) {
      for (let cy = startCY; cy <= endCY; cy++) {
        const key = this.getChunkKey(cx, cy);
        const chunkData = this.chunks.get(key);
        if (chunkData) {
            // [FIX] 使用传统的 for 循环替代 for...of 以微弱提升高性能场景下的速度
            for (let i = 0; i < chunkData.length; i++) {
                const block = chunkData[i];
                if (!seenIds.has(block.id)) {
                    // [FIX] 可选：在此处增加精确的矩形相交检测，避免仅仅因为在 Chunk 内就被选中
                    // 目前保留 MVP 逻辑以维持渲染性能 (多渲染一点比计算相交更便宜)
                    results.push(block);
                    seenIds.add(block.id);
                }
            }
        }
      }
    }
    return results;
  }

  toJSON(): string {
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