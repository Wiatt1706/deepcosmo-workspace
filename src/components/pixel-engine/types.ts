// src/engine/types.ts
import { AssetSystem } from './systems/AssetSystem';
import { World } from './core/World';
import { Camera } from './core/Camera';
import { InputSystem } from './systems/InputSystem';

// ==========================================
// 1. 基础类型与渲染上下文
// ==========================================

export interface Vec2 {
  x: number;
  y: number;
}

// [New] 将渲染上下文定义在 types 中，方便各处引用
export interface RenderContext {
    ctx: CanvasRenderingContext2D;
    viewRect: { left: number; top: number; right: number; bottom: number };
    zoom: number;
}

// [New] 增加 IWorld 接口
export interface IWorld {
    chunkSize: number;
    // 增删改查
    addBlock(block: PixelBlock): void;
    removeBlockById(id: string): boolean;
    getBlockAt(x: number, y: number): PixelBlock | null;
    
    // 核心查询 (供渲染器和物理使用)
    queryBlocksInRect(left: number, top: number, right: number, bottom: number): PixelBlock[];
    
    // 序列化
    toJSON(): string;
    fromJSON(json: string): void;
    clear(): void;
}

// [New] 定义 Layer 接口，避免 Renderer 依赖具体类
export interface ILayer {
    name: string;
    zIndex: number;
    isVisible: boolean;
    render(context: RenderContext): void;
    onInit?(): void;
    onDestroy?(): void;
}

// [New] 定义 LayerManager 接口
export interface ILayerManager {
    add(layer: ILayer): void;
    remove(name: string): void;
    get(name: string): ILayer | undefined;
    clear(): void;
}

export interface EngineSystems {
    world?: IWorld; // 改为接口
    renderer?: IRenderer; // 改为接口
    input?: InputSystem;
    assets?: AssetSystem;
    camera?: Camera;
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
  'style:set-image': [any];
  
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

// ==========================================
// 2. 更新后的核心接口
// ==========================================

export interface IRenderer {
    resize(): void;
    // [Change] 移除 drawWorld, clear，改为 draw 和 layers
    draw(): void;
    ctx: CanvasRenderingContext2D; // 暴露 ctx 供插件使用
    layers: ILayerManager;         // 暴露图层管理器接口
}

export interface EngineConfig {
  container: HTMLElement;
  chunkSize?: number;
  backgroundColor?: string;
  readOnly?: boolean;
}

export interface IEngine {
  canvas: HTMLCanvasElement;
  world: IWorld;
  camera: Camera; 
  input: InputSystem; 
  renderer: IRenderer; // 这里现在引用的是更新后的 IRenderer
  events: IEventBus; 
  assets: AssetSystem;
  config: EngineConfig;
  state: EngineState;
  
  resize(): void;
  destroy(): void;
  requestRender(): void;
  
  // 方便插件注册
  registerPlugin(plugin: IPlugin): void;
}

export interface IPlugin {
  name: string;
  onInit(engine: IEngine): void;
  onUpdate?(dt: number): void;
  onRender?(ctx: CanvasRenderingContext2D): void;
  onDestroy?(): void;
}