"use client";
import React from "react";
import useModeStore from "../_lib/modeStore";

interface ModePanelProps {
  className?: string;
}

const ModePanel: React.FC<ModePanelProps> = ({ className }) => {
  const { currentMode } = useModeStore();

  const renderModeContent = () => {
    switch (currentMode) {
      case "editor":
        return ;
      case "project":
        return ;

      default:
        return (
          <div className="text-center">
            <div className="text-4xl mb-4">❓</div>
            <h2 className="text-xl font-semibold text-gray-600">未知模式</h2>
            <p className="text-gray-500">请选择有效的编辑器模式</p>
          </div>
        );
    }
  };

  return (
    renderModeContent()
  );
};

export default ModePanel;
