// src/engine/types.ts

// --- 基础数学 ---
export interface Vec2 {
  x: number;
  y: number;
}

// --- 数据模型 ---
export interface PixelBlock {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
  type: 'basic' | 'image' | 'nested'; 
  imageUrl?: string;
  
  // 嵌套世界专用字段
  targetWorldId?: string; 
  worldName?: string;
  
  zIndex?: number;
}

export type ToolType = 'hand' | 'brush' | 'eraser' | 'rectangle' | 'image_stamp' | 'portal';

export interface ICommand {
    execute(): void;
    undo(): void;
}

// --- 事件映射表 ---
export type EngineEvents = {
  'input:mousedown': [Vec2, MouseEvent];
  'input:mousemove': [Vec2, MouseEvent];
  'input:mouseup': [Vec2, MouseEvent];
  'input:dblclick': [Vec2, MouseEvent];
  'input:wheel': [WheelEvent, Vec2];
  'input:keydown': [KeyboardEvent];
  'input:keyup': [KeyboardEvent];
  
  'tool:set': [ToolType];
  'color:set': [string];
  'image:set': [string];
  
  // [Modified] 增加 callback 参数：(targetId, worldName, onComplete)
  'world:request-enter': [string, string, (() => void)?]; 

  'viewer:block-selected': [PixelBlock | null]; 
  'viewer:block-hover': [PixelBlock | null];    

  'engine:ready': [];
  'render:after': [CanvasRenderingContext2D];
  
  'history:undo': [];
  'history:redo': [];
  'history:push': [ICommand];
  'history:state-change': [boolean, boolean];
};

export interface IEventBus {
  on<K extends keyof EngineEvents>(event: K, handler: (...args: EngineEvents[K]) => void): void;
  off<K extends keyof EngineEvents>(event: K, handler: (...args: EngineEvents[K]) => void): void;
  emit<K extends keyof EngineEvents>(event: K, ...args: EngineEvents[K]): void;
}

export interface EngineConfig {
  container: HTMLElement;
  chunkSize?: number;
  backgroundColor?: string;
  readOnly?: boolean;
}

export interface IEngine {
  canvas: HTMLCanvasElement;
  world: any; 
  camera: any; 
  input: any; 
  renderer: any;
  events: IEventBus; 
  config: EngineConfig; 
}

export interface IPlugin {
  name: string;
  onInit(engine: IEngine): void;
  onUpdate?(dt: number): void;
  onRender?(ctx: CanvasRenderingContext2D): void;
  onDestroy?(): void;
}