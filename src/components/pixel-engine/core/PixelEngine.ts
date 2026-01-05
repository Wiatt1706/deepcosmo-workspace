// core/PixelEngine.ts
import { InputManager } from "./InputManager";
import { EngineState } from "./EngineState";
import { Loop } from "./Loop";
import { Renderer } from "./render/Renderer";
import { GridLayer } from "./render/GridLayer";
import { PixelLayer } from "./render/PixelLayer";
import { OverlayLayer } from "./render/OverlayLayer";
import { AbstractTool } from "../tools/AbstractTool";

export interface PixelEngineOptions {
  /** 是否显示网格 */
  showGrid?: boolean;
  /** 初始缩放级别 */
  initialScale?: number;
  /** 像素大小（单位：像素） */
  pixelSize?: number;
}

export class PixelEngine {
  readonly state = new EngineState();
  readonly renderer: Renderer;
  readonly input: InputManager;
  readonly loop: Loop;

  private gridCanvas: HTMLCanvasElement;
  private pixelCanvas: HTMLCanvasElement;
  private overlayCanvas: HTMLCanvasElement;

  constructor(
    private container: HTMLElement,
    options: PixelEngineOptions = {}
  ) {
    // 1. 创建画布层
    this.gridCanvas = this.createCanvas("grid-layer");
    this.pixelCanvas = this.createCanvas("pixel-layer");
    this.overlayCanvas = this.createCanvas("overlay-layer");

    // 设置样式
    this.setupCanvasStyles();
    
    // 2. 初始化状态
    if (options.initialScale) {
      this.state.camera.scale = options.initialScale;
    }
    if (options.pixelSize) {
      this.state.camera.pixelSize = options.pixelSize;
    }

    // 3. 创建图层
    const layers = [];
    
    if (options.showGrid !== false) {
      layers.push(new GridLayer(
        this.gridCanvas.getContext('2d')!,
        this.state.camera
      ));
    }
    
    layers.push(new PixelLayer(
      this.pixelCanvas.getContext('2d')!,
      this.state.camera,
      this.state.pixels
    ));
    
    layers.push(new OverlayLayer(
      this.overlayCanvas.getContext('2d')!,
      this.state.camera,
      this.state
    ));

    // 4. 创建渲染器和输入管理器
    this.renderer = new Renderer(layers);
    this.input = new InputManager(this.overlayCanvas, this.state);
    this.loop = new Loop(() => this.render());

    // 5. 设置像素变化监听
    this.setupPixelStoreListeners();

    // 6. 初始调整大小
    this.resizeToContainer();
    
    // 7. 监听窗口大小变化
    window.addEventListener('resize', this.handleResize);
  }

  private createCanvas(className: string): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.className = className;
    this.container.appendChild(canvas);
    return canvas;
  }

  private setupCanvasStyles() {
    const style = document.createElement('style');
    style.textContent = `
      .pixel-engine-container {
        position: relative;
        width: 100%;
        height: 100%;
        overflow: hidden;
      }
      
      .pixel-engine-container canvas {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
      }
      
      .overlay-layer {
        pointer-events: auto !important;
      }
    `;
    
    // 确保容器有正确的类名
    this.container.classList.add('pixel-engine-container');
    document.head.appendChild(style);
  }
  
  private  setupPixelStoreListeners() {
    // 监听像素数据变化，标记像素图层需要更新
    const originalPaint = this.state.pixels.paint.bind(this.state.pixels);
    
    this.state.pixels.paint = (...args) => {
      const result = originalPaint(...args);
      
      // 找到 PixelLayer 并标记为脏
      this.renderer['layers'].forEach(layer => {
        if (layer instanceof PixelLayer) {
          layer.markDirty();
        }
      });
      
      return result;
    };

    // 监听画笔大小变化
    Object.defineProperty(this.state.pixels, 'brushSize', {
      get: () => this.state.pixels['brushSize'],
      set: (value) => {
        this.state.pixels['brushSize'] = value;
        // 标记网格层需要更新（如果使用动态网格）
        this.renderer['layers'].forEach(layer => {
          if (layer instanceof GridLayer) {
            layer.markDirty();
          }
        });
      }
    });

    // 监听颜色变化
    Object.defineProperty(this.state.pixels, 'currentColor', {
      get: () => this.state.pixels['currentColor'],
      set: (value) => {
        this.state.pixels['currentColor'] = value;
        // 不需要标记脏，因为颜色变化只影响未来的绘制
      }
    });
  }

  private handleResize = () => {
    this.resizeToContainer();
  };

  private resizeToContainer() {
    const { width, height } = this.container.getBoundingClientRect();
    this.resize(width, height);
  }

  // ===============================
  // 公共 API
  // ===============================

  start() {
    this.loop.start();
  }

  stop() {
    this.loop.stop();
    this.input.dispose();
    this.renderer.dispose?.();
    
    // 清理事件监听器
    window.removeEventListener('resize', this.handleResize);
    
    // 清理画布
    this.gridCanvas.remove();
    this.pixelCanvas.remove();
    this.overlayCanvas.remove();
  }

  resize(width: number, height: number) {
    this.state.camera.resize(width, height);
    this.renderer.resize(width, height);
  }

  render() {
    this.renderer.render();
  }

  // 快捷方式方法
  setTool(tool: AbstractTool) {
    this.state.activeTool = tool;
  }

  setBrushSize(width: number, height: number = width) {
    this.state.pixels.brushSize = { width, height };
  }

  setColor(color: string) {
    this.state.pixels.currentColor = color;
  }

  get pixels() {
    return this.state.pixels.data;
  }

  clearPixels() {
    this.state.pixels.data = {};
    this.renderer['layers'].forEach(layer => {
      if (layer instanceof PixelLayer) {
        layer.markDirty();
      }
    });
  }
}