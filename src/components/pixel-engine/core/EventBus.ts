// src/engine/core/EventBus.ts
import { EngineEvents, IEventBus } from '../types';

// 定义通用的处理器类型
type Handler<T extends keyof EngineEvents> = (...args: EngineEvents[T]) => void;

export class EventBus implements IEventBus {
  // 存储监听器，Key 是事件名，Value 是函数数组
  private listeners: Map<string, Function[]> = new Map();

  /**
   * 订阅事件 (强类型)
   * TypeScript 会根据 event 的名称自动推断 handler 的参数类型
   */
  on<K extends keyof EngineEvents>(event: K, handler: Handler<K>): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(handler);
  }

  /**
   * 取消订阅 (强类型)
   */
  off<K extends keyof EngineEvents>(event: K, handler: Handler<K>): void {
    const handlers = this.listeners.get(event);
    if (handlers) {
      this.listeners.set(event, handlers.filter(h => h !== handler));
    }
  }

  /**
   * 触发事件 (强类型)
   * args 的类型必须与 EngineEvents[K] 匹配
   */
  emit<K extends keyof EngineEvents>(event: K, ...args: EngineEvents[K]): void {
    const handlers = this.listeners.get(event);
    if (handlers) {
      handlers.forEach(fn => fn(...args));
    }
  }

  /**
   * 清空所有事件
   */
  clear() {
    this.listeners.clear();
  }
}