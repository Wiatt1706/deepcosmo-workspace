"use client";
import { Box, Ruler, Settings } from "lucide-react";
import React from "react";
import useModeStore, { EditorMode, EditorModeConfig } from "../_lib/modeStore";
import SidebarLayout from "@/components/SidebarLayout";
import {EditorToolbar} from "@/components/pixel-editor/_components/Toolbar";

// 定义组件的props类型
interface EditorSidebarProps {
  className?: string;
}

const ModelSidebar: React.FC<EditorSidebarProps> = ({ className }) => {
  const { currentMode, setCurrentMode, availableModes } = useModeStore();

  // 导航项配置 - 基于可用模式动态生成
  const navItems = availableModes.map((mode: EditorModeConfig) => ({
    id: mode.id,
    title: mode.title,
    icon: getModeIcon(mode.id),
  }));

  // 获取模式图标
  function getModeIcon(modeId: EditorMode) {
    switch (modeId) {
      case "editor":
        return Box;
      case "project":
        return Ruler;
      default:
        return Settings;
    }
  }

  // 内容渲染函数
  const renderContent = (activeId: string) => {
    const contentMap: Record<string, React.ReactNode> = {
      "editor": <EditorToolbar />,
      "project": <EditorToolbar />,
    };

    return contentMap[activeId] ?? null;
  };

  // 处理模式切换
  const handleModeChange = (modeId: string) => {
    setCurrentMode(modeId as EditorMode);
  };

  return (
    <SidebarLayout
      navItems={navItems}
      defaultActiveId={currentMode}
      className={className}
      renderContent={renderContent}
      onActiveChange={handleModeChange}
    />
  );
};

export default ModelSidebar;
