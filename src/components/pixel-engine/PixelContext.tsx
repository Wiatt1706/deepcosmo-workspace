// src/components/pixel-engine/PixelContext.tsx
"use client";
import React, { createContext, useContext, useState, useMemo, useCallback } from "react";
import { Engine } from "./core/Engine";
import { IEventBus } from "./types";

interface PixelContextType {
  engine: Engine | null;
  events: IEventBus | null;
  isReady: boolean;
  setEngine: (engine: Engine) => void;
}

const PixelContext = createContext<PixelContextType | null>(null);

export function PixelEngineProvider({ children }: { children: React.ReactNode }) {
  const [engine, setEngineInstance] = useState<Engine | null>(null);

  // [Fix: Loop] 使用 useCallback 确保函数引用在组件整个生命周期内保持不变
  const setEngine = useCallback((instance: Engine) => {
    setEngineInstance(instance);
  }, []);

  // [Fix: Loop] 使用 useMemo 缓存 context value，防止因父组件重绘导致的消费者不必要渲染
  const contextValue = useMemo(() => ({
    engine,
    events: engine ? engine.events : null,
    isReady: !!engine,
    setEngine,
  }), [engine, setEngine]);

  return (
    <PixelContext.Provider value={contextValue}>
      {children}
    </PixelContext.Provider>
  );
}

export function usePixelEngine() {
  const context = useContext(PixelContext);
  if (!context) {
    throw new Error("usePixelEngine must be used within a PixelEngineProvider");
  }
  return context;
}