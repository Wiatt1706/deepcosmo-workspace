"use client";

import {
  Grid3X3,
  MousePointer2,
  Move,
  Pencil,
  RotateCcw,
  Ruler,
  Settings,
  ZoomIn,
  ZoomOut
} from "lucide-react";
import { useEditorStore } from "../hook/pixelEditorStore";
import { Button } from "../../ui/button";
import { Label } from "../../ui/label";
import { Separator } from "../../ui/separator";
import { Switch } from "../../ui/switch";

const CADToolbar = () => {
  const {
    interactionMode,
    showGrid,
    showRuler,
    snapToGrid,
    scale,
    setInteractionMode,
    setShowGrid,
    setShowRuler,
    setSnapToGrid,
    zoomIn,
    zoomOut,
    resetView,
    zoomToFit,
  } = useEditorStore();



  const interactionModes = [
    { key: 'select', label: '选择', icon: MousePointer2 },
    { key: 'draw', label: '绘制', icon: Pencil },
    { key: 'pan', label: '平移', icon: Move },
  ] as const;

  return (
    <div className="flex flex-col gap-4 p-4 bg-white border-r border-gray-200 overflow-auto">
      <div className="flex items-center gap-2">
        <Settings className="h-5 w-5" />
        <h3 className="font-semibold">CAD 工具</h3>
      </div>

      {/* 交互模式 */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">交互模式</Label>
        <div className="grid grid-cols-3 gap-1">
          {interactionModes.map(({ key, label, icon: Icon }) => (
            <Button
              key={key}
              variant={interactionMode === key ? "default" : "outline"}
              size="sm"
              onClick={() => setInteractionMode(key)}
              className="flex flex-col items-center gap-1 h-auto py-2"
            >
              <Icon className="h-4 w-4" />
              <span className="text-xs">{label}</span>
            </Button>
          ))}
        </div>
      </div>

      <Separator />

      {/* 缩放控制（精简） */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">缩放控制</Label>

        <div className="flex gap-1">
          <Button variant="outline" size="sm" onClick={zoomOut}>
            <ZoomOut className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={zoomIn}>
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={resetView}>
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>

        <div className="text-xs text-gray-600">
          当前缩放: {(scale * 100).toFixed(0)}%
        </div>
      </div>

      <Separator />

      {/* 显示设置（核心） */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">显示设置</Label>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Grid3X3 className="h-4 w-4" />
            <Label className="text-sm">显示网格</Label>
          </div>
          <Switch
            checked={showGrid}
            onCheckedChange={setShowGrid}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Ruler className="h-4 w-4" />
            <Label className="text-sm">显示标尺</Label>
          </div>
          <Switch
            checked={showRuler}
            onCheckedChange={setShowRuler}
          />
        </div>

        <div className="flex items-center justify-between">
          <Label className="text-sm">网格捕捉</Label>
          <Switch
            checked={snapToGrid}
            onCheckedChange={setSnapToGrid}
          />
        </div>
      </div>

      <Separator />

      {/* 快捷操作 */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">快捷操作</Label>
        <div className="grid grid-cols-2 gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={zoomToFit}
            className="text-xs"
          >
            适应画布
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CADToolbar;
