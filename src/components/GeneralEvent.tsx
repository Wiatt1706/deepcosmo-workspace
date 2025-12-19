import { useCallback, useEffect } from 'react';

export function useKeyboardEvent(
  keys: string | string[],
  onKeyDown: () => void = () => { },
  onKeyUp: () => void = () => { }
): void {
  const normalizedKeys: string[] = Array.isArray(keys) ? keys : [keys];

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    const isKeyPressed = normalizedKeys.every(key => event.getModifierState(key) || event.key === key);
    if (isKeyPressed && event.type === 'keydown') {
      onKeyDown();
    }
  }, [normalizedKeys, onKeyDown]);

  const handleKeyUp = useCallback((event: KeyboardEvent) => {
    const isKeyPressed = normalizedKeys.every(key => event.getModifierState(key) || event.key === key);
    if (isKeyPressed && event.type === 'keyup') {
      onKeyUp();
    }
  }, [normalizedKeys, onKeyUp]);

  useEvent<KeyboardEvent>('keydown', handleKeyDown);
  useEvent<KeyboardEvent>('keyup', handleKeyUp);
}


type EventTargetLike = EventTarget | null | { current: EventTarget | null };

export function useEvent<T extends Event>(
  eventName: string,
  callback: (event: T) => void,
  target?: EventTargetLike,
  options?: { preventDefault?: boolean }
): void {
  useEffect(() => {
    const resolvedTarget =
      (target && typeof target === 'object' && 'current' in target
        ? target.current
        : target) || window;
    const eventHandler = (event: Event) => {
      if (options?.preventDefault) {
        event.preventDefault();
      }
      callback(event as T);
    };

    resolvedTarget.addEventListener(eventName, eventHandler as EventListener);

    return () => {
      resolvedTarget.removeEventListener(eventName, eventHandler as EventListener);
    };
  }, [eventName, callback, options?.preventDefault, (target as any)?.current || target]);
}

export function removeEvent(
  event: string,
  callback: EventListenerOrEventListenerObject,
  target: EventTarget = window
): void {
  target.removeEventListener(event, callback);
}

export const Sleep = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));
