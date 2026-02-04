import { PixelBlock } from '../types';

export class BlockMemory {
    private _capacity: number;
    private _count: number = 0;
    
    // Data Arrays (SoA Layout)
    public x!: Int32Array;
    public y!: Int32Array;
    public w!: Uint8Array;
    public h!: Uint8Array;
    public color!: Uint32Array; 
    public type!: Uint8Array;
    public created!: Uint32Array;
    
    public authorId!: Uint16Array; 
    public extraId!: Uint16Array; 

    // Dictionaries (Palettes)
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
    get capacity() { return this._capacity; }

    // ==========================================
    // Core: Allocation & Resizing
    // ==========================================

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

    private resizeBuffers(newCap: number) {
        // Helper to copy typed arrays
        const resize = (old: any, Type: any) => {
            const n = new Type(newCap);
            // 只复制有效长度，避免浪费
            n.set(old.subarray(0, Math.min(old.length, newCap)));
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

    // ==========================================
    // [New] Memory Compact (Garbage Collection)
    // ==========================================

    /**
     * 内存整理：物理移除所有 w=0 的死数据，消除碎片。
     * @returns Map<oldIndex, newIndex> 用于外部系统更新引用
     */
    public compact(): Map<number, number> {
        let validCount = 0;
        const indexMap = new Map<number, number>();

        // 1. 扫描有效数据
        for (let i = 0; i < this._count; i++) {
            if (this.w[i] > 0) {
                indexMap.set(i, validCount);
                validCount++;
            }
        }

        // 如果没有碎片，无需操作
        if (validCount === this._count) return indexMap;

        // 2. 决定新容量 (如果利用率过低，则缩容，否则保持)
        // 策略：只有当利用率低于 40% 时才缩容，避免反复抖动
        let newCapacity = this._capacity;
        if (validCount < this._capacity * 0.4) {
            newCapacity = Math.max(10000, Math.ceil(this._capacity * 0.5));
        }

        // 3. 执行数据迁移 (Allocation + Copy)
        // 为了数据安全，我们分配新的 Buffer 进行拷贝
        const old = {
            x: this.x, y: this.y, w: this.w, h: this.h,
            color: this.color, type: this.type,
            created: this.created, authorId: this.authorId, extraId: this.extraId
        };

        this.allocate(newCapacity);
        
        for (const [oldIdx, newIdx] of indexMap) {
            this.x[newIdx] = old.x[oldIdx];
            this.y[newIdx] = old.y[oldIdx];
            this.w[newIdx] = old.w[oldIdx];
            this.h[newIdx] = old.h[oldIdx];
            this.color[newIdx] = old.color[oldIdx];
            this.type[newIdx] = old.type[oldIdx];
            this.created[newIdx] = old.created[oldIdx];
            this.authorId[newIdx] = old.authorId[oldIdx];
            this.extraId[newIdx] = old.extraId[oldIdx];
        }

        // 4. 更新状态
        this._count = validCount;
        this._capacity = newCapacity;
        this.freeIndices = []; // 整理后不再有空洞

        return indexMap;
    }

    // ==========================================
    // CRUD Operations
    // ==========================================

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
        this.w[index] = 0; // Soft Delete
        this.freeIndices.push(index);
    }

    public getPixelBlock(index: number): PixelBlock | null {
        if (index < 0 || index >= this._count) return null;
        if (this.w[index] === 0) return null;

        const t = this.type[index];
        const extra = this.extraPalette[this.extraId[index]];
        
        const colorVal = this.color[index];
        const colorHex = '#' + (colorVal !== undefined ? colorVal.toString(16).padStart(6, '0') : '000000');

        return {
            id: index.toString(), // Temporary ID, usually overwritten by World
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