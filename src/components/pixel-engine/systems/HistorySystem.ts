// src/engine/systems/HistorySystem.ts
import { IEngine } from '../types';
import { HistoryFrame, HistoryOp, OpType, HistoryState } from '../history/types';
import { MathUtils } from '../utils/MathUtils';

export class HistorySystem {
    // --- Configuration ---
    private readonly MAX_HISTORY_SIZE = 100;

    // --- State ---
    // 历史时间线
    public timeline: HistoryFrame[] = [];
    // 指针指向当前状态对应的帧索引。-1 表示初始状态。
    private pointer: number = -1;

    // --- Transaction (Staging Area) ---
    private activeTransaction: HistoryFrame | null = null;

    constructor(private engine: IEngine) {}

    // =========================================
    // 1. Transaction Management (事务管理)
    // =========================================

    /**
     * 开启一个新事务 (git init)
     * @param message 操作描述 (如 "Brush Stroke")
     */
    public beginTransaction(message: string): void {
        // 如果上一个事务没提交，强制提交以保护数据
        if (this.activeTransaction) {
            console.warn(`[History] Transaction '${this.activeTransaction.message}' was not committed. Auto-committing.`);
            this.commitTransaction();
        }

        this.activeTransaction = {
            id: MathUtils.generateId('commit'),
            timestamp: Date.now(),
            message,
            ops: []
        };
    }

    /**
     * 记录原子操作 (git add)
     */
    public record(op: HistoryOp): void {
        if (!this.activeTransaction) {
            // 在开发模式下抛出错误，生产模式下警告
            console.error(`[History] Cannot record op '${op.type}' without active transaction. Call beginTransaction() first.`);
            return;
        }
        this.activeTransaction.ops.push(op);
    }

    /**
     * 提交事务 (git commit)
     */
    public commitTransaction(): void {
        if (!this.activeTransaction) return;

        // 优化：如果事务为空（没有实质操作），直接丢弃
        if (this.activeTransaction.ops.length === 0) {
            this.activeTransaction = null;
            return;
        }

        // 1. 剪断时间线：如果指针不在末尾，丢弃指针之后的所有历史 (标准 Undo/Redo 行为)
        if (this.pointer < this.timeline.length - 1) {
            this.timeline = this.timeline.slice(0, this.pointer + 1);
        }

        // 2. 推入新帧
        this.timeline.push(this.activeTransaction);
        this.pointer++;

        // 3. 内存限制：移除最早的记录
        if (this.timeline.length > this.MAX_HISTORY_SIZE) {
            this.timeline.shift();
            this.pointer--; // 修正指针
        }

        // 4. 清理暂存区
        // const frameId = this.activeTransaction.id;
        this.activeTransaction = null;
        
        this.emitStateChange();
    }

    /**
     * 回滚当前未提交的事务 (git reset --hard)
     * 用于操作中途取消 (如按下 Esc)
     */
    public rollbackTransaction(): void {
        if (!this.activeTransaction) return;
        
        console.log(`[History] Rolling back transaction: ${this.activeTransaction.message}`);

        // 逆序回滚所有已记录但未提交的 Op
        // 注意：这里的 Op 实际上已经修改了 World，所以必须执行 Undo 逻辑来复原 World
        for (let i = this.activeTransaction.ops.length - 1; i >= 0; i--) {
            const op = this.activeTransaction.ops[i];
            this.applyOp(op, 'undo');
        }

        this.activeTransaction = null;
        this.engine.requestRender();
    }

    // =========================================
    // 2. Timeline Control (时间线控制)
    // =========================================

    public undo(): void {
        if (this.pointer < 0) return; // 到底了

        const frame = this.timeline[this.pointer];
        
        // 逆序执行 Undo
        for (let i = frame.ops.length - 1; i >= 0; i--) {
            this.applyOp(frame.ops[i], 'undo');
        }

        this.pointer--;
        this.engine.requestRender();
        this.emitStateChange();
    }

    public redo(): void {
        if (this.pointer >= this.timeline.length - 1) return; // 到头了

        this.pointer++;
        const frame = this.timeline[this.pointer];

        // 正序执行 Redo
        for (const op of frame.ops) {
            this.applyOp(op, 'redo');
        }

        this.engine.requestRender();
        this.emitStateChange();
    }

    public clear(): void {
        this.timeline = [];
        this.pointer = -1;
        this.activeTransaction = null;
        this.emitStateChange();
    }

    // =========================================
    // 3. Execution Core (执行核心)
    // =========================================

    private applyOp(op: HistoryOp, direction: 'undo' | 'redo'): void {
        const { world } = this.engine;

        switch (op.type) {
            case OpType.ADD:
                if (direction === 'undo') {
                    world.removeBlockById(op.block.id);
                } else {
                    world.addBlock(op.block);
                }
                break;

            case OpType.REMOVE:
                if (direction === 'undo') {
                    // 恢复被删除的块
                    world.addBlock(op.prevBlock);
                } else {
                    world.removeBlockById(op.id);
                }
                break;

            case OpType.UPDATE:
                const props = direction === 'undo' ? op.prev : op.next;
                // 调用 World 的原子更新方法
                world.updateBlockProps(op.id, props);
                break;
        }
    }

    // =========================================
    // 4. Helpers
    // =========================================

    private emitStateChange() {
        const canUndo = this.pointer >= 0;
        const canRedo = this.pointer < this.timeline.length - 1;
        this.engine.events.emit('history:state-change', canUndo, canRedo);
    }
}