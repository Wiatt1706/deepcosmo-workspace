// src/app/editor/_components/Footer.tsx
"use client";
import React, { useEffect, useState } from "react";
import { BarChart3, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const Footer: React.FC = () => {
  // [Fix: Hydration] 初始状态设为 null，避免服务端与客户端时间不一致
  const [currentTime, setCurrentTime] = useState<Date | null>(null);

  useEffect(() => {
    setCurrentTime(new Date()); // 挂载后立即设置一次
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <TooltipProvider>
      <footer className="h-8 w-full border-t bg-background/95 backdrop-blur-sm flex items-center px-4 text-xs absolute bottom-0 z-10 select-none">
        <div className="flex justify-between w-full items-center">
          {/* 左侧 */}
          <div className="flex items-center space-x-6 min-w-0">
             <span className="text-muted-foreground">Ready</span>
          </div>

          {/* 中间 - 性能面板开关 */}
          <div className="flex items-center space-x-4 min-w-0">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" className="h-6 px-2 hover:bg-accent/50">
                  <Zap className="h-3 w-3 mr-1" />
                  <span className="font-mono">60 FPS</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Performance Monitor</TooltipContent>
            </Tooltip>
          </div>

          {/* 右侧 - 时间 (仅在客户端渲染后显示) */}
          <div className="flex items-center space-x-6 min-w-0">
            <div className="flex items-center space-x-1 text-muted-foreground">
              <BarChart3 className="h-3 w-3" />
              <span className="text-xs font-mono min-w-[60px] text-right">
                {currentTime ? currentTime.toLocaleTimeString("zh-CN", {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                }) : "--:--:--"}
              </span>
            </div>
          </div>
        </div>
      </footer>
    </TooltipProvider>
  );
};

export default Footer;