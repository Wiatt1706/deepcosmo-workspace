// components/PixelEditor.tsx
import React, { useRef } from 'react';
import { usePixelEngine } from '../pixel-engine/usePixelEngine';
export function PixelEditor() {
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = usePixelEngine(containerRef);

  const handleSetColor = (color: string) => {
    if (engineRef.current) {
      engineRef.current.setColor(color);
    }
  };

  const handleClear = () => {
    if (engineRef.current) {
      engineRef.current.clearPixels();
    }
  };

  return (
    <div className="pixel-editor">
      <div 
        ref={containerRef} 
        style={{ width: '800px', height: '600px' }}
      />
      
      <div className="controls">
        <button onClick={() => handleSetColor('#ff0000')}>红色</button>
        <button onClick={() => handleSetColor('#00ff00')}>绿色</button>
        <button onClick={() => handleSetColor('#0000ff')}>蓝色</button>
        <button onClick={handleClear}>清空</button>
      </div>
    </div>
  );
}