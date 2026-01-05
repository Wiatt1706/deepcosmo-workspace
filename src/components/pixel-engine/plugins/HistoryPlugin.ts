import { IPlugin, IEngine, ICommand } from '../types';

export class HistoryPlugin implements IPlugin {
  name = 'History';
  private engine!: IEngine;

  private undoStack: ICommand[] = [];
  private redoStack: ICommand[] = [];
  private maxHistory = 50; // 限制历史记录步数，防止内存爆炸

  onInit(engine: IEngine) {
    this.engine = engine;

    // 监听 UI 的撤销/重做请求
    engine.events.on('history:undo', this.undo);
    engine.events.on('history:redo', this.redo);
    
    // 监听其他插件的操作请求
    engine.events.on('history:push', this.push);

    this.notifyStateChange();
  }

  private push = (command: ICommand) => {
    // 1. 执行命令
    command.execute();
    
    // 2. 入栈
    this.undoStack.push(command);
    // 新的操作会清空重做栈
    this.redoStack = [];
    
    // 3. 限制栈大小
    if (this.undoStack.length > this.maxHistory) {
      this.undoStack.shift(); // 移除最旧的记录
    }

    this.notifyStateChange();
  }

  private undo = () => {
    const command = this.undoStack.pop();
    if (command) {
      command.undo();
      this.redoStack.push(command);
      this.notifyStateChange();
    }
  };

  private redo = () => {
    const command = this.redoStack.pop();
    if (command) {
      command.execute();
      this.undoStack.push(command);
      this.notifyStateChange();
    }
  };

  // 通知 UI 更新按钮状态 (禁用/启用)
  private notifyStateChange() {
    this.engine.events.emit(
      'history:state-change', 
      this.undoStack.length > 0, // canUndo
      this.redoStack.length > 0  // canRedo
    );
  }
}