// src/engine/core/World.ts
import { IWorld, PixelBlock } from '../types';
import { MathUtils } from '../utils/MathUtils';

export class World implements IWorld{
  private chunks: Map<string, PixelBlock[]> = new Map();
  private blockToChunksMap: Map<string, Set<string>> = new Map();

  public chunkSize: number;

  constructor(chunkSize: number = 128) {
    this.chunkSize = chunkSize;
  }

  private getChunkKey(cx: number, cy: number): string {
    return `${cx},${cy}`;
  }

  addBlock(block: PixelBlock) {
    const startCX = Math.floor(block.x / this.chunkSize);
    const startCY = Math.floor(block.y / this.chunkSize);
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

    // Z-Order reverse lookup
    for (let i = chunk.length - 1; i >= 0; i--) {
      const b = chunk[i];
      if (x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.h) {
        return b;
      }
    }
    return null;
  }

  /**
   * [Optimization] 渲染核心查询
   * 增加了精确剔除，减少不必要的绘制
   */
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
        const chunkBlocks = this.chunks.get(key);
        
        if (chunkBlocks) {
            // [Optimization] 使用标准 for 循环提升遍历性能
            for (let i = 0; i < chunkBlocks.length; i++) {
                const b = chunkBlocks[i];
                if (seenIds.has(b.id)) continue;

                // [Crucial] AABB 精确剔除
                // 确保只有真正与视口相交的方块才会被返回给渲染器
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