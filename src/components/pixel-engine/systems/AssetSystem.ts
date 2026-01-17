// src/engine/systems/AssetSystem.ts
import { IEventBus } from '../types';

/**
 * [Interface] 资源提供商策略接口
 * 未来对接 OSS 时，只需要实现这个接口即可，无需修改引擎核心
 */
export interface IAssetProvider {
    /**
     * 上传/处理文件
     * @param file 用户选择的文件
     * @returns 返回一个 Promise，解析为图片的 URL (Base64 或 https://cdn...)
     */
    upload(file: File): Promise<string>;
}

/**
 * [Implementation] 默认的本地演示策略
 * 将图片转换为 Base64，方便直接存储在 JSON 中进行演示，无需后端
 */
export class LocalBase64Provider implements IAssetProvider {
    upload(file: File): Promise<string> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = (error) => reject(error);
        });
    }
}

/**
 * [System] 资源管理系统
 * 负责：缓存管理、图片加载、与 Provider 交互
 */
export class AssetSystem {
    // 内存缓存：URL -> HTMLImageElement
    private textureCache: Map<string, HTMLImageElement> = new Map();
    // 正在加载中的资源，防止重复请求
    private pendingTextures: Set<string> = new Set();
    
    // 当前使用的策略 (默认使用本地 Base64)
    private provider: IAssetProvider;

    constructor(private events: IEventBus) {
        // 默认初始化为本地策略，保证演示项目开箱即用
        this.provider = new LocalBase64Provider();
    }

    /**
     * [Config] 切换存储策略 (关键点)
     * 在 React 层初始化 Engine 后，可以调用此方法注入 OSSProvider
     */
    setProvider(provider: IAssetProvider) {
        this.provider = provider;
    }

    /**
     * 处理用户上传
     * 1. 使用 Provider 获取 URL (Base64 或 CDN Link)
     * 2. 预加载图片
     */
    async uploadAsset(file: File): Promise<string> {
        const url = await this.provider.upload(file);
        
        // 预加载图片到缓存，确保渲染时不会闪烁
        await this.preloadTexture(url);
        
        return url;
    }

    /**
     * 渲染器调用的同步获取方法
     * 如果缓存有，直接返回；如果没有，触发加载并返回 undefined
     */
    getTexture(url: string): HTMLImageElement | undefined {
        if (this.textureCache.has(url)) {
            return this.textureCache.get(url);
        }

        // 如果没有缓存且没在加载中，触发加载
        if (!this.pendingTextures.has(url)) {
            this.preloadTexture(url);
        }

        return undefined;
    }

    /**
     * 内部加载逻辑
     */
    private preloadTexture(url: string): Promise<void> {
        if (this.pendingTextures.has(url)) return Promise.resolve();
        
        this.pendingTextures.add(url);

        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = "Anonymous"; // 支持跨域 CDN
            img.src = url;
            
            img.onload = () => {
                this.textureCache.set(url, img);
                this.pendingTextures.delete(url);
                
                // [Notification] 图片加载完毕，通知引擎可能有新内容需要渲染
                // 这里我们发送一个通用的事件，或者 Engine 会在下一帧 loop 中自动获取到
                this.events.emit('asset:loaded', url);
                resolve();
            };

            img.onerror = (e) => {
                this.pendingTextures.delete(url);
                console.error(`[AssetSystem] Failed to load texture: ${url}`);
                reject(e);
            };
        });
    }

    /**
     * 清理缓存 (如切换场景时)
     */
    clear() {
        this.textureCache.clear();
        this.pendingTextures.clear();
    }
}