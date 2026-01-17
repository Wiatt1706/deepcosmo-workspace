// src/engine/core/EventBus.ts
import { EngineEvents, IEventBus } from '../types';

type Handler<T extends keyof EngineEvents> = (...args: EngineEvents[T]) => void;

export class EventBus implements IEventBus {
  private listeners: Map<string, Function[]> = new Map();

  /**
   * 订阅事件
   * @returnsUnsubscribe function
   */
  on<K extends keyof EngineEvents>(event: K, handler: Handler<K>): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(handler);
    
    // [Optimization] 返回清理函数，方便 React useEffect 使用
    return () => this.off(event, handler);
  }

  off<K extends keyof EngineEvents>(event: K, handler: Handler<K>): void {
    const handlers = this.listeners.get(event);
    if (handlers) {
      this.listeners.set(event, handlers.filter(h => h !== handler));
    }
  }

  emit<K extends keyof EngineEvents>(event: K, ...args: EngineEvents[K]): void {
    const handlers = this.listeners.get(event);
    if (handlers) {
      // 拷贝一份执行，防止执行过程中监听器列表变化导致的问题
      [...handlers].forEach(fn => fn(...args));
    }
  }

  clear() {
    this.listeners.clear();
  }
}