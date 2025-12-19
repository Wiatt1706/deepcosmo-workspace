import { create } from "zustand";

export type EditorMode ="project" | "editor";

export interface EditorModeConfig {
  id: EditorMode;
  title: string;
  description: string;
  icon: string;
}

interface ModeState {
  currentMode: EditorMode;
  availableModes: EditorModeConfig[];
  setCurrentMode: (mode: EditorMode) => void;
  getModeConfig: (mode: EditorMode) => EditorModeConfig | undefined;
}

// 预定义的编辑器模式
const defaultAvailableModes: EditorModeConfig[] = [
  {
    id: "editor",
    title: "像素编辑器",
    description: "2D像素艺术创作",
    icon: "🎬",
  },
  {
    id: "project",
    title: "画板编辑器",
    description: "多画布项目管理",
    icon: "📐",
  },
];

const useModeStore = create<ModeState>(set => ({
  currentMode: "editor",
  availableModes: defaultAvailableModes,

  setCurrentMode: mode => {
    set({ currentMode: mode });
  },

  getModeConfig: mode => {
    return defaultAvailableModes.find(config => config.id === mode);
  },
}));

export default useModeStore;
