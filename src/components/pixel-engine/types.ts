// src/engine/types.ts

export interface Vec2 {
  x: number;
  y: number;
}

export interface PixelBlock {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
  type: 'basic' | 'image' | 'nested'; 
  imageUrl?: string;
  targetWorldId?: string; 
  worldName?: string;
  zIndex?: number;
}

export type ToolType = 'hand' | 'brush' | 'eraser' | 'rectangle' | 'portal';

// [New] 填充模式：决定当前工具生成的是纯色块还是图片块
export type FillMode = 'color' | 'image';

export interface ICommand {
    execute(): void;
    undo(): void;
}

export interface EngineState {
    currentTool: ToolType;
    
    // [Refactor] 材质/样式状态
    fillMode: FillMode;
    activeColor: string;
    activeImage: string | null; // Base64 或 URL
    
    isContinuous: boolean;
    isReadOnly: boolean;
    debugMode: boolean;
}

export type EngineEvents = {
  'input:mousedown': [Vec2, MouseEvent];
  'input:mousemove': [Vec2, MouseEvent];
  'input:mouseup': [Vec2, MouseEvent];
  'input:dblclick': [Vec2, MouseEvent];
  'input:wheel': [WheelEvent, Vec2];
  'input:keydown': [KeyboardEvent];
  'input:keyup': [KeyboardEvent];
  
  'tool:set': [ToolType];
  'setting:continuous': [boolean];
  
  // [Refactor] 样式控制事件
  'style:set-color': [string];
  'style:set-image': [string];
  
  'world:request-enter': [string, string, (() => void)?]; 
  'viewer:block-selected': [PixelBlock | null]; 
  'viewer:block-hover': [PixelBlock | null];    

  'engine:ready': [];
  'render:after': [CanvasRenderingContext2D];
  
  'history:undo': [];
  'history:redo': [];
  'history:push': [ICommand, boolean?]; 
  'history:state-change': [boolean, boolean];
  
  'state:change': [Partial<EngineState>];
};

export interface IEventBus {
  on<K extends keyof EngineEvents>(event: K, handler: (...args: EngineEvents[K]) => void): void;
  off<K extends keyof EngineEvents>(event: K, handler: (...args: EngineEvents[K]) => void): void;
  emit<K extends keyof EngineEvents>(event: K, ...args: EngineEvents[K]): void;
  clear(): void;
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
  state: EngineState;
  
  resize(): void;
  destroy(): void;
}

export interface IPlugin {
  name: string;
  onInit(engine: IEngine): void;
  onUpdate?(dt: number): void;
  onRender?(ctx: CanvasRenderingContext2D): void;
  onDestroy?(): void;
}