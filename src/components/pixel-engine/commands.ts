// src/commands/index.ts

import { ICommand, PixelBlock, IWorld, SelectionRect } from './types';
import { SelectionSystem } from './systems/SelectionSystem';

/**
 * [Core] 批处理命令
 * 保证事务的一致性，Undo 时必须严格倒序执行
 */
export class BatchCommand implements ICommand {
    constructor(private commands: ICommand[]) {}

    execute() { 
        this.commands.forEach(c => c.execute()); 
    }

    undo() { 
        // [Critical] 必须倒序执行！
        // 例如：先删 A，后加 B。撤销时必须先删 B，后加 A。
        for (let i = this.commands.length - 1; i >= 0; i--) { 
            this.commands[i].undo(); 
        } 
    }

    get isEmpty() { return this.commands.length === 0; }
}

/**
 * [Fixed] 添加方块命令
 * 增加了“防重复”检查，解决 Redo 时可能产生的 ID 冲突
 */
export class AddBlockCommand implements ICommand {
    constructor(private world: IWorld, private block: PixelBlock) {}

    execute() {
        // [Safety Check] 如果 World 里莫名其妙已经有了这个 ID (可能是脏数据)，先清理掉
        if (this.world.getBlockById(this.block.id)) {
            // console.warn(`[AddBlock] ID collision detected: ${this.block.id}, overwriting.`);
            this.world.removeBlockById(this.block.id);
        }
        this.world.addBlock(this.block);
    }

    undo() {
        // 撤销添加 = 移除
        // 这里不需要检查是否存在，removeBlockById 内部通常会处理不存在的情况
        this.world.removeBlockById(this.block.id);
    }
}

/**
 * [Fixed] 移除方块命令
 * 逻辑重构：Execute 时“捕获”真实对象，Undo 时“归还”真实对象
 */
export class RemoveBlockCommand implements ICommand {
    // 捕获被删除的方块实例，用于 Undo 时恢复
    private capturedBlock: PixelBlock | null = null;

    constructor(
        private world: IWorld, 
        private x: number, 
        private y: number, 
        // 可选：如果调用者明确知道要删哪个块 (如选区移动时)，传入此参数更安全
        private explicitBlock?: PixelBlock
    ) {}

    execute() {
        let target: PixelBlock | null = null;

        if (this.explicitBlock) {
            // 场景 1：明确指定了要删除的对象 (SelectionTool 调用)
            // 必须确认它真的还在 World 里
            const existing = this.world.getBlockById(this.explicitBlock.id);
            if (existing) {
                target = existing;
            }
        } else {
            // 场景 2：只知道坐标 (EraserTool 调用)
            target = this.world.getBlockAt(this.x, this.y);
        }

        if (target) {
            // [Critical] 保存引用！这是撤销的“药引子”
            this.capturedBlock = target;
            this.world.removeBlockById(target.id);
        } else {
            // 如果本来就没东西，这次删除是无效操作
            this.capturedBlock = null;
        }
    }

    undo() {
        // 只有当 execute 真正删除了东西，我们才恢复
        if (this.capturedBlock) {
            // [Safety Check] 恢复前，确保位置/ID 是干净的
            // 防止万一 ID 已经被别的操作占用了 (虽然 ID 是唯一的，但防不胜防)
            if (this.world.getBlockById(this.capturedBlock.id)) {
                this.world.removeBlockById(this.capturedBlock.id);
            }
            
            this.world.addBlock(this.capturedBlock);
        }
    }
}

/**
 * [New] 选区状态恢复命令
 * 职责：在撤销/重做时，将 SelectionSystem 的状态（红框 + 选中ID）恢复到快照时的样子。
 */
export class RestoreSelectionCommand implements ICommand {
    constructor(
        private system: SelectionSystem,
        private before: { ids: string[], rect: SelectionRect | null },
        private after: { ids: string[], rect: SelectionRect | null }
    ) {}

    execute() {
        // Redo 时，恢复到"操作后"的状态
        this.system.restoreSnapshot(this.after.ids, this.after.rect);
    }

    undo() {
        // Undo 时，恢复到"操作前"的状态
        this.system.restoreSnapshot(this.before.ids, this.before.rect);
    }
}