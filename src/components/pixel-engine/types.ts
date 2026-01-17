// src/engine/types.ts
import { AssetSystem } from './systems/AssetSystem';
import { World } from './core/World';
import { Camera } from './core/Camera';
import { InputSystem } from './systems/InputSystem';

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
export type FillMode = 'color' | 'image';

export interface ICommand {
    execute(): void;
    undo(): void;
}

export interface EngineState {
    currentTool: ToolType;
    fillMode: FillMode;
    activeColor: string;
    activeImage: { url: string; isUploading: boolean; originalFile?: File } | null;
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
  'style:set-color': [string];
  'style:set-image': [any]; // 这里 activeImage 的类型比较复杂，暂用 any 或保持一致
  
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
  'asset:loaded': [string]; 
};

export interface IEventBus {
  on<K extends keyof EngineEvents>(event: K, handler: (...args: EngineEvents[K]) => void): () => void;
  off<K extends keyof EngineEvents>(event: K, handler: (...args: EngineEvents[K]) => void): void;
  emit<K extends keyof EngineEvents>(event: K, ...args: EngineEvents[K]): void;
  clear(): void;
}

export interface IRenderer {
    resize(): void;
    drawWorld(): void;
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
  
  // [Fix] 使用强类型替代 any
  world: World;
  camera: Camera; 
  input: InputSystem; 
  renderer: IRenderer;
  events: IEventBus; 
  assets: AssetSystem;
  
  config: EngineConfig;
  state: EngineState;
  
  resize(): void;
  destroy(): void;
  
  // [New] 被动渲染请求方法
  requestRender(): void;
}

export interface IPlugin {
  name: string;
  onInit(engine: IEngine): void;
  onUpdate?(dt: number): void;
  onRender?(ctx: CanvasRenderingContext2D): void;
  onDestroy?(): void;
}