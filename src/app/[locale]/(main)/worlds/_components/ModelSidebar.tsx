// src/app/editor/_components/ModelSidebar.tsx
"use client";
import { Box, Ruler, Settings } from "lucide-react";
import React from "react";
import useModeStore, { EditorMode } from "../_lib/modeStore";
import SidebarLayout from "@/components/SidebarLayout";
import { EditorToolbar } from "@/components/pixel-engine/_components/Toolbar";

interface EditorSidebarProps {
  className?: string;
}

const ModelSidebar: React.FC<EditorSidebarProps> = ({ className }) => {
  const { currentMode, setCurrentMode, availableModes } = useModeStore();

  const getModeIcon = (modeId: EditorMode) => {
    switch (modeId) {
      case "editor": return Box;
      case "project": return Ruler;
      default: return Settings;
    }
  };

  const navItems = availableModes.map((mode) => ({
    id: mode.id,
    title: mode.title,
    icon: getModeIcon(mode.id),
  }));

  const renderContent = (activeId: string) => {
    // 简单映射，目前两个模式都暂时使用 EditorToolbar，后续可区分
    if (activeId === "editor") return <EditorToolbar />;
    if (activeId === "project") return <div className="p-4 text-sm text-muted-foreground">Project Viewer Tools</div>;
    return null;
  };

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