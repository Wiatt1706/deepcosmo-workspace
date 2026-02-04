// src/engine/history/types.ts
import { PixelBlock } from '../types';

/**
 * [Enum] 原子操作类型枚举
 */
export enum OpType {
    ADD = 'ADD',
    REMOVE = 'REMOVE',
    UPDATE = 'UPDATE'
}

/**
 * [Interface] 原子操作 - 添加
 * 必须包含完整的 Block 数据以便 Redo
 */
export interface OpAdd {
    type: OpType.ADD;
    block: PixelBlock;
}

/**
 * [Interface] 原子操作 - 删除
 * 必须包含被删除前的完整 Block 数据以便 Undo
 */
export interface OpRemove {
    type: OpType.REMOVE;
    id: string; // 目标 Block 的 UUID
    prevBlock: PixelBlock; 
}

/**
 * [Interface] 原子操作 - 更新
 * 使用 Partial<T> 存储差异 (Delta)，实现内存高效的属性变更
 */
export interface OpUpdate {
    type: OpType.UPDATE;
    id: string; // 目标 Block 的 UUID
    prev: Partial<PixelBlock>; // 变更前的属性 (Undo)
    next: Partial<PixelBlock>; // 变更后的属性 (Redo)
}

// 联合类型，用于类型守卫
export type HistoryOp = OpAdd | OpRemove | OpUpdate;

/**
 * [Interface] 历史帧 (Transaction/Commit)
 * 这是推入栈中的最小单位，包含一组原子操作
 */
export interface HistoryFrame {
    id: string;          // 唯一的 Commit ID (UUID)
    timestamp: number;   // 时间戳
    message: string;     // 操作描述 (如 "Brush Stroke", "Move Selection")
    ops: HistoryOp[];    // 原子操作序列
}

/**
 * [Interface] 历史系统状态 (用于 UI 同步)
 */
export interface HistoryState {
    canUndo: boolean;
    canRedo: boolean;
    stackSize: number;
    headIndex: number;
}