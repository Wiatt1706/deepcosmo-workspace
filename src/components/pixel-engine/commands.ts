// src/engine/commands/index.ts

import { ICommand, PixelBlock, IWorld, SelectionRect } from './types';
import { SelectionSystem } from './systems/SelectionSystem';

export class BatchCommand implements ICommand {
    constructor(private commands: ICommand[]) {}
    execute() { this.commands.forEach(c => c.execute()); }
    undo() { for (let i = this.commands.length - 1; i >= 0; i--) { this.commands[i].undo(); } }
}

export class AddBlockCommand implements ICommand {
    // 依赖 block.id (UUID)
    constructor(private world: IWorld, private block: PixelBlock) {}

    execute() {
        this.world.addBlock(this.block);
    }

    undo() {
        // [Fixed] 直接使用 ID 删除，因为 World 现在维护了 Map
        this.world.removeBlockById(this.block.id);
    }
}

export class RemoveBlockCommand implements ICommand {
    private capturedBlock: PixelBlock | null = null;
    
    constructor(
        private world: IWorld, 
        private x: number, 
        private y: number, 
        private explicitBlock?: PixelBlock
    ) {}

    execute() {
        let target: PixelBlock | null = null;
        if (this.explicitBlock) {
            target = this.explicitBlock;
        } else {
            target = this.world.getBlockAt(this.x, this.y);
        }

        if (target) {
            this.capturedBlock = target;
            this.world.removeBlockById(target.id);
        }
    }

    undo() {
        if (this.capturedBlock) {
            this.world.addBlock(this.capturedBlock);
        }
    }
}

export class RestoreSelectionCommand implements ICommand {
    constructor(
        private system: SelectionSystem,
        // [Fixed] 使用 string[] (UUIDs)
        private before: { ids: string[], rect: SelectionRect | null },
        private after: { ids: string[], rect: SelectionRect | null }
    ) {}

    execute() {
        this.system.restoreSnapshot(this.after.ids, this.after.rect);
    }

    undo() {
        this.system.restoreSnapshot(this.before.ids, this.before.rect);
    }
}