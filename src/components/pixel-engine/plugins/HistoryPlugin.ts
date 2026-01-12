// src/engine/plugins/HistoryPlugin.ts
import { IPlugin, IEngine, ICommand } from '../types';

export class HistoryPlugin implements IPlugin {
  name = 'History';
  private engine!: IEngine;
  private undoStack: ICommand[] = [];
  private redoStack: ICommand[] = [];
  private maxHistory = 50;

  onInit(engine: IEngine) {
    this.engine = engine;

    engine.events.on('history:undo', this.undo);
    engine.events.on('history:redo', this.redo);
    engine.events.on('history:push', this.push);
    
    // [New] 绑定全局快捷键
    window.addEventListener('keydown', this.handleKeydown);

    this.notifyStateChange();
  }

  onDestroy() {
      window.removeEventListener('keydown', this.handleKeydown);
  }

  // [New] 快捷键处理
  private handleKeydown = (e: KeyboardEvent) => {
      // Mac uses Meta (Command), Windows uses Ctrl
      const isCtrl = e.ctrlKey || e.metaKey; 
      
      if (isCtrl && !e.shiftKey && (e.key === 'z' || e.key === 'Z')) {
          e.preventDefault();
          this.undo();
      }
      
      if ((isCtrl && e.shiftKey && (e.key === 'z' || e.key === 'Z')) || (isCtrl && (e.key === 'y' || e.key === 'Y'))) {
          e.preventDefault();
          this.redo();
      }
  };

  private push = (command: ICommand, executed: boolean = false) => {
    // [FIX] 如果是批量操作，工具层可能已经逐步执行了，这里不需要再次 execute
    if (!executed) {
        command.execute();
    }
    
    this.undoStack.push(command);
    this.redoStack = []; // Clear redo on new action
    
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

  private notifyStateChange() {
    this.engine.events.emit(
      'history:state-change', 
      this.undoStack.length > 0, 
      this.redoStack.length > 0 
    );
  }
}