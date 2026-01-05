export class EventEmitter {
  private listeners = new Set<() => void>();

  on(fn: () => void) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  emit() {
    this.listeners.forEach(fn => fn());
  }
}
