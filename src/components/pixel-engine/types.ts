// src/engine/types.ts

import type { AssetSystem } from './systems/AssetSystem';
import type { Camera } from './core/Camera';
import type { InputSystem } from './systems/InputSystem';
import type { SelectionSystem } from './systems/SelectionSystem';
import type { HistorySystem } from './systems/HistorySystem';
import type { ProjectSystem } from './systems/ProjectSystem'; // [New]

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

// [Core Interface] 核心世界接口
export interface IWorld {
    chunkSize: number;
    
    // 暴露内存访问 (BlockMemory)
    readonly memory: any;

    // 核心 CRUD
    addBlock(block: PixelBlock): number; // 返回内存索引
    removeBlockById(id: string): boolean;
    
    // 原子更新：支持通过 UUID 更新部分属性 (History System 核心依赖)
    updateBlockProps(id: string, props: Partial<PixelBlock>): boolean;

    // 查询接口
    getBlockAt(x: number, y: number): PixelBlock | null;
    getBlockById(id: string): PixelBlock | undefined; 
    getIndexById(id: string): number | undefined;
    
    // 空间查询
    queryIndicesInRect(left: number, top: number, right: number, bottom: number): number[];
    queryBlocksInRect(left: number, top: number, right: number, bottom: number): PixelBlock[];
    
    // 碰撞检测
    isRegionOccupied(x: number, y: number, w: number, h: number, ignoreIds?: Set<string>): boolean;
    isPointOccupied(x: number, y: number): boolean;
    
    // [Serialization & GC] 核心优化接口
    toBinary(): ArrayBuffer;
    loadFromBinary(buffer: ArrayBuffer): void; // [New]
    rebuildIndices(): void; // [New]
    defragment(): void;     // [New] 内存整理
    
    // 兼容性接口
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

// 依赖注入容器
export interface EngineSystems {
    world?: IWorld;
    renderer?: IRenderer;
    input?: InputSystem;
    assets?: AssetSystem;
    camera?: Camera;
    selection?: SelectionSystem;
    history?: HistorySystem;
    project?: ProjectSystem; // [New]
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
  id: string; // UUID
  x: number;
  y: number;
  w: number;
  h: number;
  color: string; // #RRGGBB
  type: 'basic' | 'image' | 'nested'; 
  
  // 扩展字段
  author?: string;
  createdAt?: number;
  
  imageUrl?: string;
  targetWorldId?: string; 
  worldName?: string;
  zIndex?: number;
}

export type ToolType = 'hand' | 'brush' | 'eraser' | 'rectangle' | 'portal' | 'rectangle-select';
export type FillMode = 'color' | 'image';

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
  chunkSize?: number;       
  gridSize?: number;        
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
  
  // 核心子系统
  selection: SelectionSystem;
  history: HistorySystem; 
  project: ProjectSystem; // [New]

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