import { World } from './core/World';
import { ICommand, PixelBlock } from './types';

/**
 * 添加方块命令
 */
export class AddBlockCommand implements ICommand {
  // 必须保存 block 的完整副本，以便 redo 时使用
  constructor(private world: World, private block: PixelBlock) {}

  execute() {
    this.world.addBlock(this.block);
  }

  undo() {
    // 撤销添加 = 根据 ID 删除
    this.world.removeBlockById(this.block.id);
  }
}

/**
 * 删除方块命令
 */
export class RemoveBlockCommand implements ICommand {
  // 暂存被删除的方块，以便 undo 时恢复
  private removedBlock: PixelBlock | null = null;

  constructor(private world: World, private x: number, private y: number) {}

  execute() {
    // 1. 找到要删除的方块
    this.removedBlock = this.world.getBlockAt(this.x, this.y);
    if (this.removedBlock) {
      // 2. 执行删除
      this.world.removeBlockById(this.removedBlock.id);
    }
  }

  undo() {
    // 撤销删除 = 把暂存的方块加回去
    if (this.removedBlock) {
      this.world.addBlock(this.removedBlock);
    }
  }
}

// 未来可以扩展：MoveBlockCommand, ChangeColorCommand 等