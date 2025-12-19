"use client";

import React, { useRef } from "react";
import { useEditorStore } from "./hook/pixelEditorStore";
import EditCanvas from "./_components/Canvas";
import useScale from "./hook/useScale";

interface CADEditorProps {
  className?: string;
}

const Editor: React.FC<CADEditorProps> = ({ className }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scale, setScale } = useScale(1, 1, 1, 0.1, containerRef.current);

  // 使用Zustand状态管理
  const {
    setScale: setCADScale,
  } = useEditorStore();

  // 同步缩放状态
  React.useEffect(() => {
    setCADScale(scale);
  }, [scale, setCADScale]);

  return (
    <div className={`w-full h-full flex bg-white ${className}`}>
      {/* 主画布区域 */}
      <div className="flex-1 flex flex-col">
        {/* 画布区域 */}
        <div className="flex-1 relative" ref={containerRef}>
          <EditCanvas />
        </div>
      </div>
    </div>
  );
};

export default Editor;
