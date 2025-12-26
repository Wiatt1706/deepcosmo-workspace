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
  ZoomOut,
  Square,
  Palette,
  Eraser
} from "lucide-react";
import { useEditorStore } from "../hook/pixelEditorStore";
import { Button } from "../../ui/button";
import { Label } from "../../ui/label";
import { Separator } from "../../ui/separator";
import { Switch } from "../../ui/switch";
import { Input } from "../../ui/input";
import { Slider } from "../../ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../ui/tabs";
import { useState } from "react";

const Toolbar = () => {
  const {
    interactionMode,
    showGrid,
    showRuler,
    snapToGrid,
    scale,
    currentColor,
    brushSize,
    setInteractionMode,
    setShowGrid,
    setShowRuler,
    setSnapToGrid,
    setCurrentColor,
    setBrushSize,
    zoomIn,
    zoomOut,
    resetView,
    zoomToFit,
  } = useEditorStore();

  const [activeTab, setActiveTab] = useState("tools");

  // 预定义颜色选项
  const colorPalette = [
    "#000000", "#FFFFFF", "#FF3B30", "#FF9500", "#FFCC00", 
    "#34C759", "#007AFF", "#5856D6", "#AF52DE", "#FF2D55"
  ];

  const interactionModes = [
    { key: "select", label: "选择", icon: MousePointer2, description: "选择和移动对象" },
    { key: "draw", label: "绘制", icon: Pencil, description: "绘制像素" },
    { key: "pan", label: "平移", icon: Move, description: "移动画布" },
  ] as const;

  return (
    <div className="flex flex-col h-full w-64 bg-gradient-to-b from-gray-50 to-white border-r border-gray-200 shadow-sm overflow-hidden">
      {/* 顶部标题区 */}
      <div className="flex items-center gap-3 p-4 border-b border-gray-200 bg-white">
        <div className="p-2 bg-blue-50 rounded-lg">
          <Settings className="h-5 w-5 text-blue-600" />
        </div>
        <div>
          <h3 className="font-semibold text-gray-900">像素编辑器</h3>
          <p className="text-xs text-gray-500">缩放: {(scale * 100).toFixed(0)}%</p>
        </div>
      </div>

      {/* 标签导航 */}
      <div className="px-4 pt-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-3">
            <TabsTrigger value="tools" className="text-xs">工具</TabsTrigger>
            <TabsTrigger value="brush" className="text-xs">笔刷</TabsTrigger>
            <TabsTrigger value="view" className="text-xs">视图</TabsTrigger>
          </TabsList>

          {/* 工具标签页 */}
          <TabsContent value="tools" className="space-y-6 py-4">
            <div className="space-y-3">
              <Label className="text-sm font-medium text-gray-700">工具模式</Label>
              <div className="grid grid-cols-2 gap-2">
                {interactionModes.map(({ key, label, icon: Icon }) => (
                  <Button
                    key={key}
                    variant={interactionMode === key ? "default" : "outline"}
                    size="sm"
                    onClick={() => setInteractionMode(key)}
                    className="flex flex-col items-center gap-2 h-16"
                  >
                    <Icon className="h-4 w-4" />
                    <span className="text-xs">{label}</span>
                  </Button>
                ))}
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <Label className="text-sm font-medium text-gray-700">画布控制</Label>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={zoomOut}
                  className="flex-1"
                  title="缩小"
                >
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={zoomIn}
                  className="flex-1"
                  title="放大"
                >
                  <ZoomIn className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={resetView}
                  className="flex-1"
                  title="重置视图"
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={zoomToFit}
                className="w-full text-xs"
              >
                适应画布
              </Button>
            </div>
          </TabsContent>

          {/* 笔刷标签页 */}
          <TabsContent value="brush" className="space-y-6 py-4">
            <div className="space-y-4">
              <div className="space-y-3">
                <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <Palette className="h-4 w-4" />
                  颜色设置
                </Label>
                
                {/* 当前颜色预览 */}
                <div className="flex items-center gap-3">
                  <div 
                    className="w-10 h-10 rounded-lg border border-gray-300"
                    style={{ backgroundColor: currentColor }}
                  />
                  <Input
                    type="text"
                    value={currentColor}
                    onChange={(e) => setCurrentColor(e.target.value)}
                    className="font-mono text-sm"
                  />
                </div>

                {/* 快速颜色选择 */}
                <div>
                  <Label className="text-xs text-gray-600 mb-2 block">快速选择</Label>
                  <div className="grid grid-cols-5 gap-2">
                    {colorPalette.map((color) => (
                      <button
                        key={color}
                        className="w-6 h-6 rounded border border-gray-300 hover:scale-110 transition-transform"
                        style={{ backgroundColor: color }}
                        onClick={() => setCurrentColor(color)}
                        title={color}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <Square className="h-4 w-4" />
                  笔刷大小
                </Label>
                
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-1">
                      <Label className="text-xs text-gray-600">宽度: {brushSize.width}px</Label>
                      <span className="text-xs text-gray-500">1-50px</span>
                    </div>
                    <Slider
                      value={[brushSize.width]}
                      min={1}
                      max={50}
                      step={1}
                      onValueChange={([value]) => 
                        setBrushSize(value, brushSize.height)
                      }
                      className="w-full"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between mb-1">
                      <Label className="text-xs text-gray-600">高度: {brushSize.height}px</Label>
                      <span className="text-xs text-gray-500">1-50px</span>
                    </div>
                    <Slider
                      value={[brushSize.height]}
                      min={1}
                      max={50}
                      step={1}
                      onValueChange={([value]) => 
                        setBrushSize(brushSize.width, value)
                      }
                      className="w-full"
                    />
                  </div>

                  {/* 预设尺寸 */}
                  <div>
                    <Label className="text-xs text-gray-600 mb-2 block">预设尺寸</Label>
                    <div className="flex flex-wrap gap-2">
                      {[1, 3, 5, 10, 20].map((size) => (
                        <Button
                          key={size}
                          variant={brushSize.width === size && brushSize.height === size ? "default" : "outline"}
                          size="sm"
                          className="text-xs px-2 h-7"
                          onClick={() => setBrushSize(size, size)}
                        >
                          {size}×{size}
                        </Button>
                      ))}
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs px-2 h-7"
                        onClick={() => setBrushSize(1, 50)}
                        title="直线工具"
                      >
                        1×50
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs px-2 h-7"
                        onClick={() => setBrushSize(50, 1)}
                        title="直线工具"
                      >
                        50×1
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* 笔刷预览 */}
              <div className="pt-4 border-t border-gray-200">
                <Label className="text-xs text-gray-600 mb-2 block">笔刷预览</Label>
                <div className="flex flex-col items-center gap-2 p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-center w-24 h-24 bg-white rounded border border-gray-300">
                    <div 
                      className="bg-current border border-gray-800"
                      style={{
                        width: `${Math.min(brushSize.width, 20) * 4}px`,
                        height: `${Math.min(brushSize.height, 20) * 4}px`,
                        backgroundColor: currentColor,
                      }}
                    />
                  </div>
                  <p className="text-xs text-gray-600 text-center">
                    {brushSize.width} × {brushSize.height} 像素
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* 视图标签页 */}
          <TabsContent value="view" className="space-y-6 py-4">
            <div className="space-y-4">
              <Label className="text-sm font-medium text-gray-700">显示设置</Label>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Grid3X3 className="h-4 w-4 text-gray-600" />
                    <Label className="text-sm">显示网格</Label>
                  </div>
                  <Switch
                    checked={showGrid}
                    onCheckedChange={setShowGrid}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Ruler className="h-4 w-4 text-gray-600" />
                    <Label className="text-sm">显示标尺</Label>
                  </div>
                  <Switch
                    checked={showRuler}
                    onCheckedChange={setShowRuler}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 flex items-center justify-center">
                      <div className="w-3 h-3 border border-gray-600 rounded-sm" />
                    </div>
                    <Label className="text-sm">网格捕捉</Label>
                  </div>
                  <Switch
                    checked={snapToGrid}
                    onCheckedChange={setSnapToGrid}
                  />
                </div>
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <Label className="text-sm font-medium text-gray-700">辅助功能</Label>
              
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  onClick={() => {
                    setBrushSize(1, 1);
                    setCurrentColor("#FFFFFF");
                  }}
                >
                  <Eraser className="h-3 w-3 mr-1" />
                  橡皮擦
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  onClick={() => setSnapToGrid(!snapToGrid)}
                >
                  {snapToGrid ? "关闭" : "开启"}捕捉
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* 底部状态栏 */}
      <div className="mt-auto p-3 border-t border-gray-200 bg-gray-50">
        <div className="text-xs text-gray-600 space-y-1">
          <div className="flex justify-between">
            <span>模式:</span>
            <span className="font-medium text-gray-900 capitalize">
              {interactionMode}
            </span>
          </div>
          <div className="flex justify-between">
            <span>笔刷:</span>
            <span className="font-medium text-gray-900">
              {brushSize.width}×{brushSize.height}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Toolbar;