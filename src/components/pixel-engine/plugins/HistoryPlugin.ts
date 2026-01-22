import { IPlugin, IEngine, ICommand } from '../types';

export class HistoryPlugin implements IPlugin {
    name = 'History';
    private engine!: IEngine;
    
    // 命令栈
    private undoStack: ICommand[] = [];
    private redoStack: ICommand[] = [];
    private maxHistory = 50; // 最大历史记录步数

    onInit(engine: IEngine) {
        this.engine = engine;

        // 1. 绑定核心事件
        engine.events.on('history:undo', this.undo);
        engine.events.on('history:redo', this.redo);
        engine.events.on('history:push', this.push);
        
        // 2. 监听键盘事件 (通过 KeybindingSystem 进行语义匹配)
        // 注意：我们监听 engine 的事件，而不是 window，因为 InputSystem 已经统一代理了
        engine.events.on('input:keydown', this.handleKeydown);

        // 初始化状态通知
        this.notifyStateChange();
    }

    onDestroy() {
        // 插件销毁时的清理逻辑
        // EventBus 会在 Engine 销毁时统一清理，但如果是动态卸载插件，
        // 最好在这里手动 off 事件 (当前架构简化处理)
    }

    /**
     * [Refactor] 键盘处理逻辑
     * 不再硬编码检测 e.ctrlKey && e.key === 'z'
     * 而是询问 InputSystem: "这个事件匹配 history:undo 吗？"
     */
    private handleKeydown = (e: KeyboardEvent) => {
        const keys = this.engine.input.keys;

        if (keys.matches('history:undo', e)) {
            e.preventDefault(); // 阻止浏览器默认的撤销
            this.undo();
        } else if (keys.matches('history:redo', e)) {
            e.preventDefault();
            this.redo();
        }
    };

    private push = (command: ICommand, executed: boolean = false) => {
        // 如果命令已经被工具执行过（executed=true），则不再执行
        // 如果是纯数据命令（如粘贴），可能需要在这里 execute
        if (!executed) {
            command.execute();
        }
        
        this.undoStack.push(command);
        this.redoStack = []; //一旦有新操作，重做栈必须清空
        
        // 限制栈大小
        if (this.undoStack.length > this.maxHistory) {
            this.undoStack.shift();
        }

        this.notifyStateChange();
    }

    private undo = () => {
        const command = this.undoStack.pop();
        if (command) {
            command.undo();
            this.redoStack.push(command);
            this.notifyStateChange();
            
            // 触发渲染
            this.engine.requestRender();
        }
    };

    private redo = () => {
        const command = this.redoStack.pop();
        if (command) {
            command.execute();
            this.undoStack.push(command);
            this.notifyStateChange();

            // 触发渲染
            this.engine.requestRender();
        }
    };

    private notifyStateChange() {
        // 通知 UI 层更新“撤销/重做”按钮的禁用状态
        this.engine.events.emit(
            'history:state-change', 
            this.undoStack.length > 0, 
            this.redoStack.length > 0 
        );
    }
}