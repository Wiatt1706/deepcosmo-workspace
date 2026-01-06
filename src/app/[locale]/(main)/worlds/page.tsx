"use client";

import Editor from "@/components/pixel-editor";
import HeaderTool from "./_components/header-tool";
import useModeStore from "./_lib/modeStore";
import PixelEditor from "@/components/pixel-engine/PixelEditor";
import PixelViewer from "@/components/pixel-engine/PixelViewer";

export default function Home() {
  const { currentMode } = useModeStore();

  if (currentMode === "editor") {
    return (
      <>
        <HeaderTool />
        <div className="w-full h-full bg-neutral-50">
          <PixelEditor />
        </div>
      </>
    );
  }

  if (currentMode === "project") {
    return (
      <div className="w-full h-full">
        <PixelViewer />
      </div>
    );
  }

  return (
    <div className="w-full h-full flex items-center justify-center">
      <div className="text-center">
        <div className="text-4xl mb-4">❓</div>
        <h2 className="text-xl font-semibold text-gray-600">未知模式</h2>
        <p className="text-gray-500">请选择有效的编辑器模式</p>
      </div>
    </div>
  );
}
