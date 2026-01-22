import { ICommand, PixelBlock, IWorld } from './types';

// 批量命令容器
export class BatchCommand implements ICommand {
    constructor(private commands: ICommand[]) {}

    execute() {
        this.commands.forEach(c => c.execute());
    }

    undo() {
        for (let i = this.commands.length - 1; i >= 0; i--) {
            this.commands[i].undo();
        }
    }
    
    get isEmpty() {
        return this.commands.length === 0;
    }
}

export class AddBlockCommand implements ICommand {
    constructor(private world: IWorld, private block: PixelBlock) {}

    execute() {
        this.world.addBlock(this.block);
    }

    undo() {
        this.world.removeBlockById(this.block.id);
    }
}

export class RemoveBlockCommand implements ICommand {
    private removedBlock: PixelBlock | null = null;

    // [Fix] 使用 IWorld 接口
    constructor(private world: IWorld, private x: number, private y: number) {}

    execute() {
        // 移除前先获取，以便撤销
        this.removedBlock = this.world.getBlockAt(this.x, this.y);
        if (this.removedBlock) {
            this.world.removeBlockById(this.removedBlock.id);
        }
    }

    undo() {
        if (this.removedBlock) {
            this.world.addBlock(this.removedBlock);
        }
    }
}