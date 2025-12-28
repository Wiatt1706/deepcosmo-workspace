"use client";

import React, { useRef } from "react";
import EditCanvas from "./_components/Canvas";

interface EditorProps {
  className?: string;
}

const Editor: React.FC<EditorProps> = ({ className }) => {
  const containerRef = useRef<HTMLDivElement>(null);

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
