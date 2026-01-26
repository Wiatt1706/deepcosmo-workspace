// src/engine/types.ts

// 为了避免循环依赖问题，建议使用 import type
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

// 渲染上下文定义
export interface RenderContext {
    ctx: CanvasRenderingContext2D;
    viewRect: { left: number; top: number; right: number; bottom: number };
    zoom: number;
}

// [Update] 核心世界接口：增加了物理检测 API
export interface IWorld {
    chunkSize: number;
    
    // 基础 CRUD
    addBlock(block: PixelBlock): void;
    removeBlockById(id: string): boolean;
    getBlockAt(x: number, y: number): PixelBlock | null;
    
    // [Fix] 添加缺失的接口定义
    // 这允许 SelectionSystem 通过 ID 快速找回方块 (用于 Undo/Redo)
    getBlockById(id: string): PixelBlock | undefined; 
    
    // 区域查询 (渲染核心)
    queryBlocksInRect(left: number, top: number, right: number, bottom: number): PixelBlock[];
    
    // 物理检测
    isRegionOccupied(x: number, y: number, w: number, h: number, ignoreIds?: Set<string>): boolean;
    isPointOccupied(x: number, y: number): boolean;
    
    // 序列化与清理
    toJSON(): string;
    fromJSON(json: string): void;
    clear(): void;
}

// 图层接口
export interface ILayer {
    name: string;
    zIndex: number;
    isVisible: boolean;
    render(context: RenderContext): void;
    onInit?(): void;
    onDestroy?(): void;
}

// 图层管理器接口
export interface ILayerManager {
    add(layer: ILayer): void;
    remove(name: string): void;
    get(name: string): ILayer | undefined;
    clear(): void;
}

// DI 容器结构
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

// 选区矩形 (世界坐标)
export interface SelectionRect {
    x: number;
    y: number;
    w: number;
    h: number;
}

// 剪贴板数据格式
export interface ClipboardData {
    source: 'pixel-engine';
    width: number;
    height: number;
    blocks: PixelBlock[]; // 相对坐标数据
}

// 像素方块核心结构
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

// 工具类型枚举
export type ToolType = 'hand' | 'brush' | 'eraser' | 'rectangle' | 'portal' | 'rectangle-select';
export type FillMode = 'color' | 'image';

// 命令模式接口
export interface ICommand {
    execute(): void;
    undo(): void;
}

// 引擎状态
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
  // Input Events
  'input:mousedown': [Vec2, MouseEvent];
  'input:mousemove': [Vec2, MouseEvent];
  'input:mouseup': [Vec2, MouseEvent];
  'input:dblclick': [Vec2, MouseEvent];
  'input:wheel': [WheelEvent, Vec2];
  'input:keydown': [KeyboardEvent];
  'input:keyup': [KeyboardEvent];
  
  // State & Settings
  'tool:set': [ToolType];
  'setting:continuous': [boolean];
  'style:set-color': [string];
  'style:set-image': [any];
  'state:change': [Partial<EngineState>];
  
  // World Interaction
  'world:request-enter': [string, string, (() => void)?]; 
  'viewer:block-selected': [PixelBlock | null]; 
  'viewer:block-hover': [PixelBlock | null];    

  // Lifecycle & Render
  'engine:ready': [];
  'render:after': [CanvasRenderingContext2D];
  'asset:loaded': [string]; 
  
  // History
  'history:undo': [];
  'history:redo': [];
  'history:push': [ICommand, boolean?]; 
  'history:state-change': [boolean, boolean];
  
  // Selection System Events
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
// 4. 核心接口 (Engine & Renderer)
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
  backgroundColor?: string;
  readOnly?: boolean;
}

export interface IEngine {
  canvas: HTMLCanvasElement;
  config: EngineConfig;
  state: EngineState;
  
  // Systems
  world: IWorld;
  camera: Camera; 
  input: InputSystem; 
  renderer: IRenderer;
  events: IEventBus; 
  assets: AssetSystem;
  selection: SelectionSystem;

  // Methods
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