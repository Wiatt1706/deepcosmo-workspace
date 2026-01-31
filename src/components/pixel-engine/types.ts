// src/engine/types.ts

import type { AssetSystem } from './systems/AssetSystem';
import type { Camera } from './core/Camera';
import type { InputSystem } from './systems/InputSystem';
import type { SelectionSystem } from './systems/SelectionSystem';

// ==========================================
// 1. 基础类型与渲染上下文
// ==========================================

export interface Vec2 {
  x: number;
  y: number;
}

export interface RenderContext {
    ctx: CanvasRenderingContext2D;
    viewRect: { left: number; top: number; right: number; bottom: number };
    zoom: number;
}

// 核心世界接口
export interface IWorld {
    chunkSize: number;
    
    addBlock(block: PixelBlock): void;
    removeBlockById(id: string): boolean;
    getBlockAt(x: number, y: number): PixelBlock | null;
    getBlockById(id: string): PixelBlock | undefined; 
    
    queryBlocksInRect(left: number, top: number, right: number, bottom: number): PixelBlock[];
    isRegionOccupied(x: number, y: number, w: number, h: number, ignoreIds?: Set<string>): boolean;
    isPointOccupied(x: number, y: number): boolean;
    
    toJSON(): string;
    fromJSON(json: string): void;
    clear(): void;
}

export interface ILayer {
    name: string;
    zIndex: number;
    isVisible: boolean;
    render(context: RenderContext): void;
    onInit?(): void;
    onDestroy?(): void;
}

export interface ILayerManager {
    add(layer: ILayer): void;
    remove(name: string): void;
    get(name: string): ILayer | undefined;
    clear(): void;
}

export interface EngineSystems {
    world?: IWorld;
    renderer?: IRenderer;
    input?: InputSystem;
    assets?: AssetSystem;
    camera?: Camera;
    selection?: SelectionSystem;
}

// ==========================================
// 2. 数据结构定义
// ==========================================

export interface SelectionRect {
    x: number;
    y: number;
    w: number;
    h: number;
}

export interface ClipboardData {
    source: 'pixel-engine';
    width: number;
    height: number;
    blocks: PixelBlock[];
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

export type ToolType = 'hand' | 'brush' | 'eraser' | 'rectangle' | 'portal' | 'rectangle-select';
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

// ==========================================
// 3. 事件系统定义
// ==========================================

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
  'state:change': [Partial<EngineState>];
  
  'world:request-enter': [string, string, (() => void)?]; 
  'viewer:block-selected': [PixelBlock | null]; 
  'viewer:block-hover': [PixelBlock | null];    
  
  'editor:block-click': [PixelBlock];

  'engine:ready': [];
  'render:after': [CanvasRenderingContext2D];
  'asset:loaded': [string]; 
  
  'history:undo': [];
  'history:redo': [];
  'history:push': [ICommand, boolean?]; 
  'history:state-change': [boolean, boolean];
  
  'selection:change': [SelectionRect | null]; 
  'selection:move': [SelectionRect]; 
  'selection:copy': [];
  'selection:paste': [ClipboardData];
};

export interface IEventBus {
  on<K extends keyof EngineEvents>(event: K, handler: (...args: EngineEvents[K]) => void): () => void;
  off<K extends keyof EngineEvents>(event: K, handler: (...args: EngineEvents[K]) => void): void;
  emit<K extends keyof EngineEvents>(event: K, ...args: EngineEvents[K]): void;
  clear(): void;
}

// ==========================================
// 4. 核心接口
// ==========================================

export interface IRenderer {
    resize(): void;
    draw(): void;
    ctx: CanvasRenderingContext2D;
    layers: ILayerManager;
}

export interface EngineConfig {
  container: HTMLElement;
  chunkSize?: number;       // 数据分块大小 (通常 128)
  gridSize?: number;        // [New] 视觉/操作网格大小 (通常 20)
  backgroundColor?: string;
  readOnly?: boolean;
}

export interface IEngine {
  canvas: HTMLCanvasElement;
  config: EngineConfig;
  state: EngineState;
  
  world: IWorld;
  camera: Camera; 
  input: InputSystem; 
  renderer: IRenderer;
  events: IEventBus; 
  assets: AssetSystem;
  selection: SelectionSystem;

  resize(): void;
  destroy(): void;
  requestRender(): void;
  registerPlugin(plugin: IPlugin): void;
}

export interface IPlugin {
  name: string;
  onInit(engine: IEngine): void;
  onUpdate?(dt: number): void;
  onRender?(ctx: CanvasRenderingContext2D): void;
  onDestroy?(): void;
}