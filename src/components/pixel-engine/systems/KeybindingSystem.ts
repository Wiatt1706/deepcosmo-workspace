import { IEventBus } from '../types';

export interface KeyBinding {
    action: string;      // 动作名称，如 'history:undo'
    keys: string[];      // 默认按键组合，如 ['Control', 'z']
    description?: string; // 用于显示在 UI 设置面板上
}

/**
 * [System] 快捷键管理器
 * 负责解析键盘事件，匹配注册的快捷键动作。
 * 支持：
 * 1. 组合键检测 (Ctrl+C, Shift+Alt+Z)
 * 2. 跨平台兼容 (Mac Meta vs Windows Ctrl)
 * 3. 动态改键 (Rebinding)
 */
export class KeybindingSystem {
    // 动作 -> 绑定配置
    private bindings: Map<string, KeyBinding> = new Map();
    
    // 缓存当前按下的修饰键状态
    private modifiers = {
        ctrl: false,
        shift: false,
        alt: false,
        meta: false // Command key on Mac
    };

    constructor(private events: IEventBus) {}

    /**
     * 注册快捷键
     */
    register(action: string, keys: string[], description: string = '') {
        this.bindings.set(action, { action, keys: keys.map(k => k.toLowerCase()), description });
    }

    /**
     * 核心匹配逻辑
     * 在 keydown 事件中调用，判断当前事件是否匹配某个动作
     */
    matches(action: string, e: KeyboardEvent): boolean {
        const binding = this.bindings.get(action);
        if (!binding) return false;

        const targetKeys = binding.keys;
        const pressedKey = e.key.toLowerCase();

        // 1. 检查修饰键是否匹配
        // 如果绑定里要求了 'control'，则 e.ctrlKey 必须为 true
        const reqCtrl = targetKeys.includes('control') || targetKeys.includes('ctrl');
        const reqShift = targetKeys.includes('shift');
        const reqAlt = targetKeys.includes('alt');
        const reqMeta = targetKeys.includes('meta') || targetKeys.includes('command');

        // [Cross-Platform] Mac 上通常用 Meta 代替 Ctrl
        // 这里做一个简化的商业级处理：如果我们定义了 'mod'，则在 Mac 匹配 Meta，在 Win 匹配 Ctrl
        const isMac = /Mac|iPod|iPhone|iPad/.test(navigator.platform);
        const reqMod = targetKeys.includes('mod');
        
        // 实际需要的状态
        const needCtrl = reqCtrl || (reqMod && !isMac);
        const needMeta = reqMeta || (reqMod && isMac);

        if (e.ctrlKey !== needCtrl) return false;
        if (e.shiftKey !== reqShift) return false;
        if (e.altKey !== reqAlt) return false;
        if (e.metaKey !== needMeta) return false;

        // 2. 检查主键 (非修饰键)
        // 排除掉修饰键本身，剩下的就是主键 (如 'z')
        const mainKey = targetKeys.find(k => !['control', 'ctrl', 'shift', 'alt', 'meta', 'command', 'mod'].includes(k));
        
        if (mainKey && mainKey !== pressedKey) {
            return false;
        }

        return true;
    }

    /**
     * 获取所有注册的快捷键 (供 UI 设置面板使用)
     */
    getAllBindings() {
        return Array.from(this.bindings.values());
    }

    /**
     * 动态修改快捷键
     */
    rebind(action: string, newKeys: string[]) {
        const binding = this.bindings.get(action);
        if (binding) {
            binding.keys = newKeys.map(k => k.toLowerCase());
        }
    }
}