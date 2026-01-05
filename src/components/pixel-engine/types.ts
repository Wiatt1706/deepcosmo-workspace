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
  type: 'basic' | 'image' | 'nested'; // 'nested' 为嵌套世界入口
  imageUrl?: string;
  
  // [New] 嵌套世界专用字段
  targetWorldId?: string; 
  worldName?: string;
  
  zIndex?: number;
}

// --- 工具类型 ---
// [New] 新增 'portal' 工具
export type ToolType = 'hand' | 'brush' | 'eraser' | 'rectangle' | 'image_stamp' | 'portal';

// --- 命令接口 ---
export interface ICommand {
    execute(): void;
    undo(): void;
}

// --- 事件映射表 ---
export type EngineEvents = {
  // Input Events
  'input:mousedown': [Vec2, MouseEvent];
  'input:mousemove': [Vec2, MouseEvent];
  'input:mouseup': [Vec2, MouseEvent];
  'input:dblclick': [Vec2, MouseEvent]; // [New] 双击事件
  'input:wheel': [WheelEvent, Vec2];
  'input:keydown': [KeyboardEvent];
  'input:keyup': [KeyboardEvent];
  
  // Logic Events
  'tool:set': [ToolType];
  'color:set': [string];
  'image:set': [string];
  
  // [New] Navigation Events
  'world:request-enter': [string, string]; // (targetId, worldName)

  // Lifecycle Events
  'engine:ready': [];
  'render:after': [CanvasRenderingContext2D];
  
  // History Events
  'history:undo': [];
  'history:redo': [];
  'history:push': [ICommand];
  'history:state-change': [boolean, boolean];
};

// --- 核心接口 ---

export interface IEventBus {
  on<K extends keyof EngineEvents>(event: K, handler: (...args: EngineEvents[K]) => void): void;
  off<K extends keyof EngineEvents>(event: K, handler: (...args: EngineEvents[K]) => void): void;
  emit<K extends keyof EngineEvents>(event: K, ...args: EngineEvents[K]): void;
}

export interface IEngine {
  canvas: HTMLCanvasElement;
  world: any; // 建议后续定义 IWorld
  camera: any;
  input: any; 
  renderer: any;
  events: IEventBus; 
}

export interface IPlugin {
  name: string;
  onInit(engine: IEngine): void;
  onUpdate?(dt: number): void;
  onRender?(ctx: CanvasRenderingContext2D): void;
  onDestroy?(): void;
}

export interface EngineConfig {
  container: HTMLElement;
  chunkSize?: number;
  backgroundColor?: string;
  readOnly?: boolean;
}