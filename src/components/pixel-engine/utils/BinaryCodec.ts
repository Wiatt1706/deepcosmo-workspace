import { BlockMemory } from '../core/BlockMemory';

export class BinaryCodec {
    private static readonly MAGIC = 0x5049584C; // "PIXL"
    private static readonly VERSION = 1;

    /**
     * Encode: BlockMemory -> ArrayBuffer
     */
    public static encode(memory: BlockMemory): ArrayBuffer {
        // 1. Encode Palettes (Strings)
        const authorBuf = this.encodeStringArray(memory.authorPalette);
        const extraBuf = this.encodeStringArray(memory.extraPalette);

        const count = memory.count;
        // Header(12) + Palettes + Data
        // Data Body per block: x(4)+y(4)+w(1)+h(1)+color(4)+type(1)+created(4)+aId(2)+eId(2) = 23 bytes
        const BLOCK_SIZE = 23;
        const bodySize = count * BLOCK_SIZE;

        const totalSize = 12 + authorBuf.byteLength + extraBuf.byteLength + bodySize;
        const buffer = new ArrayBuffer(totalSize);
        const view = new DataView(buffer);
        let offset = 0;

        // 2. Write Header
        view.setUint32(offset, this.MAGIC, true); offset += 4;
        view.setUint32(offset, this.VERSION, true); offset += 4;
        view.setUint32(offset, count, true); offset += 4;

        // 3. Write Palettes
        new Uint8Array(buffer, offset).set(new Uint8Array(authorBuf));
        offset += authorBuf.byteLength;
        
        new Uint8Array(buffer, offset).set(new Uint8Array(extraBuf));
        offset += extraBuf.byteLength;

        // 4. Write Body (Direct TypedArray Dump)
        // We sequentially dump the active part of each array
        const writeArray = (arr: ArrayLike<number>, bytesPerEl: number) => {
            // @ts-ignore: TypedArray subarray
            const sub = arr.subarray(0, count);
            const bytes = new Uint8Array(sub.buffer, sub.byteOffset, sub.byteLength);
            new Uint8Array(buffer, offset).set(bytes);
            offset += (count * bytesPerEl);
        };

        writeArray(memory.x, 4);
        writeArray(memory.y, 4);
        writeArray(memory.w, 1);
        writeArray(memory.h, 1);
        writeArray(memory.color, 4);
        writeArray(memory.type, 1);
        writeArray(memory.created, 4);
        writeArray(memory.authorId, 2);
        writeArray(memory.extraId, 2);

        return buffer;
    }

    /**
     * Decode: ArrayBuffer -> Target Memory
     */
    public static decode(buffer: ArrayBuffer, target: { memory: BlockMemory, rebuildIndices: () => void }): void {
        const view = new DataView(buffer);
        let offset = 0;

        // 1. Verify Header
        const magic = view.getUint32(offset, true); offset += 4;
        if (magic !== this.MAGIC) throw new Error("Invalid PIXL file format");
        
        const version = view.getUint32(offset, true); offset += 4;
        if (version !== 1) throw new Error("Unsupported PIXL version");

        const count = view.getUint32(offset, true); offset += 4;

        // 2. Decode Palettes
        const { strings: authors, bytesRead: aRead } = this.decodeStringArray(buffer, offset);
        offset += aRead;
        
        const { strings: extras, bytesRead: eRead } = this.decodeStringArray(buffer, offset);
        offset += eRead;

        // 3. Setup Memory
        const memory = target.memory;
        memory.clear();
        // Slightly larger capacity to allow editing
        // @ts-ignore access private via public logic in real world, or allow access
        memory.allocate(Math.max(count, 1000)); 
        // Force set count (this is internal manipulation for perf)
        (memory as any)._count = count;

        // Restore Palettes
        memory.authorPalette = authors;
        // Rebuild Maps
        (memory as any).authorMap.clear();
        authors.forEach((s, i) => (memory as any).authorMap.set(s, i));
        
        memory.extraPalette = extras;
        (memory as any).extraMap.clear();
        extras.forEach((s, i) => (memory as any).extraMap.set(s, i));

        // 4. Read Body
        const readArray = (dest: any, bytesPerEl: number) => {
            const byteLen = count * bytesPerEl;
            const srcBytes = new Uint8Array(buffer, offset, byteLen);
            const destView = new Uint8Array(dest.buffer, dest.byteOffset, dest.byteLength);
            destView.set(srcBytes);
            offset += byteLen;
        };

        readArray(memory.x, 4);
        readArray(memory.y, 4);
        readArray(memory.w, 1);
        readArray(memory.h, 1);
        readArray(memory.color, 4);
        readArray(memory.type, 1);
        readArray(memory.created, 4);
        readArray(memory.authorId, 2);
        readArray(memory.extraId, 2);

        // 5. Rebuild World Indices
        target.rebuildIndices();
    }

    // --- Private Helpers ---

    private static encodeStringArray(arr: string[]): ArrayBuffer {
        const encoder = new TextEncoder();
        // Count(2) + [Len(2) + Bytes]...
        const items = arr.map(s => encoder.encode(s));
        
        let totalBytes = 2;
        items.forEach(b => totalBytes += (2 + b.length));
        
        const buf = new ArrayBuffer(totalBytes);
        const view = new DataView(buf);
        let off = 0;
        
        view.setUint16(off, arr.length, true); off += 2;
        
        items.forEach(b => {
            view.setUint16(off, b.length, true); off += 2;
            new Uint8Array(buf, off).set(b); off += b.length;
        });
        
        return buf;
    }

    private static decodeStringArray(buffer: ArrayBuffer, startOffset: number) {
        const view = new DataView(buffer);
        let off = startOffset;
        const count = view.getUint16(off, true); off += 2;
        
        const strings: string[] = [];
        const decoder = new TextDecoder();
        
        for(let i=0; i<count; i++) {
            const len = view.getUint16(off, true); off += 2;
            const bytes = new Uint8Array(buffer, off, len);
            strings.push(decoder.decode(bytes));
            off += len;
        }
        
        return { strings, bytesRead: off - startOffset };
    }
}