// src/engine/core/BlockMemory.ts
import { PixelBlock } from '../types';

export class BlockMemory {
    // [Fixed] Rename to _capacity to allow public getter
    private _capacity: number;
    private _count: number = 0;
    
    // Data Arrays
    public x!: Int32Array;
    public y!: Int32Array;
    public w!: Uint8Array;
    public h!: Uint8Array;
    public color!: Uint32Array; 
    public type!: Uint8Array;
    public created!: Uint32Array;
    
    public authorId!: Uint16Array; 
    public extraId!: Uint16Array; 

    // Dictionaries
    public authorPalette: string[] = [""]; 
    private authorMap: Map<string, number> = new Map([["", 0]]);
    
    public extraPalette: string[] = [""];
    private extraMap: Map<string, number> = new Map([["", 0]]);

    private freeIndices: number[] = [];

    constructor(initialCapacity: number = 100000) {
        this._capacity = initialCapacity;
        this.allocate(initialCapacity);
    }

    get count() { return this._count; }
    
    // [Fixed] Public getter for SelectionSystem to check bounds
    get capacity() { return this._capacity; }

    public overrideCount(n: number) {
        this._count = n;
    }

    private allocate(cap: number) {
        this.x = new Int32Array(cap);
        this.y = new Int32Array(cap);
        this.w = new Uint8Array(cap);
        this.h = new Uint8Array(cap);
        this.color = new Uint32Array(cap);
        this.type = new Uint8Array(cap);
        this.created = new Uint32Array(cap);
        this.authorId = new Uint16Array(cap);
        this.extraId = new Uint16Array(cap);
    }

    public prepare(targetCount: number) {
        if (targetCount > this._capacity) {
            const newCap = Math.max(targetCount, Math.floor(this._capacity * 1.5));
            this.resizeBuffers(newCap);
        }
    }

    private resizeBuffers(newCap: number) {
        const resize = (old: any, Type: any) => {
            const n = new Type(newCap);
            n.set(old);
            return n;
        };
        this.x = resize(this.x, Int32Array);
        this.y = resize(this.y, Int32Array);
        this.w = resize(this.w, Uint8Array);
        this.h = resize(this.h, Uint8Array);
        this.color = resize(this.color, Uint32Array);
        this.type = resize(this.type, Uint8Array);
        this.created = resize(this.created, Uint32Array);
        this.authorId = resize(this.authorId, Uint16Array);
        this.extraId = resize(this.extraId, Uint16Array);
        this._capacity = newCap;
    }

    private ensureCapacity() {
        if (this._count >= this._capacity) {
            const newCap = Math.floor(this._capacity * 1.5);
            this.resizeBuffers(newCap);
        }
    }

    public add(block: PixelBlock): number {
        this.ensureCapacity();
        const index = this.freeIndices.length > 0 ? this.freeIndices.pop()! : this._count++;

        this.x[index] = block.x;
        this.y[index] = block.y;
        this.w[index] = block.w;
        this.h[index] = block.h;
        this.color[index] = parseInt(block.color.replace('#', ''), 16);
        this.created[index] = block.createdAt || Math.floor(Date.now() / 1000);
        this.type[index] = block.type === 'image' ? 1 : (block.type === 'nested' ? 2 : 0);

        const author = block.author || '';
        let aId = this.authorMap.get(author);
        if (aId === undefined) {
            aId = this.authorPalette.push(author) - 1;
            this.authorMap.set(author, aId);
        }
        this.authorId[index] = aId;

        const extra = block.imageUrl || block.targetWorldId || '';
        let eId = this.extraMap.get(extra);
        if (eId === undefined) {
            eId = this.extraPalette.push(extra) - 1;
            this.extraMap.set(extra, eId);
        }
        this.extraId[index] = eId;

        return index;
    }

    public remove(index: number) {
        if (index < 0 || index >= this._count) return;
        if (this.w[index] === 0) return; 
        this.w[index] = 0; 
        this.freeIndices.push(index);
    }

    public getPixelBlock(index: number): PixelBlock | null {
        if (index < 0 || index >= this._count || index >= this.color.length) return null;
        if (this.w[index] === 0) return null;

        const t = this.type[index];
        const extra = this.extraPalette[this.extraId[index]];
        
        const colorVal = this.color[index];
        const colorHex = '#' + (colorVal !== undefined ? colorVal.toString(16).padStart(6, '0') : '000000');

        return {
            id: index.toString(),
            x: this.x[index],
            y: this.y[index],
            w: this.w[index],
            h: this.h[index],
            color: colorHex,
            type: t === 1 ? 'image' : (t === 2 ? 'nested' : 'basic'),
            author: this.authorPalette[this.authorId[index]],
            createdAt: this.created[index],
            imageUrl: t === 1 ? extra : undefined,
            targetWorldId: t === 2 ? extra : undefined,
            worldName: t === 2 ? `World #${extra.slice(-4)}` : undefined
        };
    }

    public clear() {
        this._count = 0;
        this.freeIndices = [];
        this.authorMap.clear(); this.authorMap.set("", 0); this.authorPalette = [""];
        this.extraMap.clear(); this.extraMap.set("", 0); this.extraPalette = [""];
    }
}