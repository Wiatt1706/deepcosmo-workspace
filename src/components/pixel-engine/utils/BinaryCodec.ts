// src/engine/utils/BinaryCodec.ts
import { BlockMemory } from '../core/BlockMemory';
import { World } from '../core/World';

export class BinaryCodec {
    static readonly MAGIC = 0x50584C32; // "PXL2"
    static readonly VERSION = 1;

    static encode(mem: BlockMemory): ArrayBuffer {
        const count = mem.count;
        
        const dictStr = JSON.stringify({
            authors: mem.authorPalette,
            extras: mem.extraPalette
        });
        const dictBytes = new TextEncoder().encode(dictStr);

        const header = new Uint32Array([
            this.MAGIC, this.VERSION, count, dictBytes.byteLength
        ]);

        const parts = [
            new Uint8Array(header.buffer),
            dictBytes,
            new Uint8Array(mem.x.buffer, 0, count * 4),
            new Uint8Array(mem.y.buffer, 0, count * 4),
            mem.w.slice(0, count), 
            mem.h.slice(0, count),
            new Uint8Array(mem.color.buffer, 0, count * 4),
            mem.type.slice(0, count),
            new Uint8Array(mem.created.buffer, 0, count * 4),
            new Uint8Array(mem.authorId.buffer, 0, count * 2),
            new Uint8Array(mem.extraId.buffer, 0, count * 2),
        ];

        let totalSize = 0;
        for (const part of parts) totalSize += part.byteLength;

        const result = new Uint8Array(totalSize);
        let offset = 0;
        for (const part of parts) {
            result.set(part, offset);
            offset += part.byteLength;
        }

        return result.buffer;
    }

    static decode(buffer: ArrayBuffer, world: World) {
        try {
            const view = new DataView(buffer);
            let offset = 0;

            const magic = view.getUint32(offset, true); offset += 4;
            if (magic !== this.MAGIC) throw new Error("File corrupted: Invalid Magic");

            const version = view.getUint32(offset, true); offset += 4;
            const count = view.getUint32(offset, true); offset += 4;
            const dictLen = view.getUint32(offset, true); offset += 4;

            const dictBytes = new Uint8Array(buffer, offset, dictLen);
            const dict = JSON.parse(new TextDecoder().decode(dictBytes));
            world.memory.authorPalette = dict.authors;
            world.memory.extraPalette = dict.extras;
            
            offset += dictLen;

            // 1. 扩容
            world.memory.prepare(count);

            // 2. [Fixed] 必须在 prepare 之后重新获取内存引用！
            const mem = world.memory;

            const readTo = (targetArr: any, elementSize: number) => {
                const byteLen = count * elementSize;
                // 注意：使用 slice 创建 buffer 的副本，确保 TypedArray 构造函数能正确工作
                const sourceData = new targetArr.constructor(buffer.slice(offset, offset + byteLen));
                targetArr.set(sourceData);
                offset += byteLen;
            };

            readTo(mem.x, 4);
            readTo(mem.y, 4);
            readTo(mem.w, 1);
            readTo(mem.h, 1);
            readTo(mem.color, 4);
            readTo(mem.type, 1);
            readTo(mem.created, 4);
            readTo(mem.authorId, 2);
            readTo(mem.extraId, 2);

            mem.overrideCount(count);

            // Rebuild Spatial Hash
            for(let i=0; i<count; i++) {
                // @ts-ignore
                world.registerIndexInSpatialHash(i, mem.x[i], mem.y[i], mem.w[i], mem.h[i]);
            }

        } catch (err) {
            console.error("[BinaryCodec] Decode Failed:", err);
            throw err;
        }
    }
}