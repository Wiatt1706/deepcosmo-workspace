"use client";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  CheckCircle,
  Clock,
  Database,
  Gauge,
  HardDrive as Memory,
  TrendingDown,
  TrendingUp,
  Zap,
} from "lucide-react";
import React, { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";


const Footer: React.FC = () => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [displayedFps, setDisplayedFps] = useState(60);
  const [displayedFrameTime, setDisplayedFrameTime] = useState(16);

  // 更新时间
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

 
  return (
    <TooltipProvider>
      <footer className="h-8 w-full border-t bg-background/95 backdrop-blur-sm flex items-center px-4 text-xs absolute bottom-0 z-10 transition-all duration-200">
        <div className="flex justify-between w-full items-center">
          {/* 左侧统计信息 */}
          <div className="flex items-center space-x-6 min-w-0">
           
          </div>

          {/* 中间性能指示器和控制按钮 */}
          <div className="flex items-center space-x-4 min-w-0">
            {/* 性能状态指示器 */}
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  className={`flex items-center space-x-2 px-3 py-1 min-w-[120px] justify-center`}
                >
                  
                 
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <div className="space-y-1">
                  <div className="font-medium">性能状态</div>
                  <div className="text-xs space-y-1">
                   
                  </div>
                </div>
              </TooltipContent>
            </Tooltip>

            {/* 性能控制按钮 */}
            <div className="flex items-center space-x-2 flex-shrink-0">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 hover:bg-accent/50"
                  >
                    <Zap className="h-3 w-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <div className="space-y-1">
                    <div className="font-medium">性能系统</div>
                    <div className="text-xs">打开性能监控和测试面板</div>
                  </div>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>

          {/* 右侧系统信息 */}
          <div className="flex items-center space-x-6 min-w-0">
            <div className="flex items-center space-x-1 text-muted-foreground flex-shrink-0">
              <BarChart3 className="h-3 w-3" />
              <span className="text-xs">
                {currentTime.toLocaleTimeString("zh-CN", {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                })}
              </span>
            </div>
          </div>
        </div>
      </footer>
    </TooltipProvider>
  );
};

// 统计项子组件
const StatItem = ({
  label,
  value,
  highlight = false,
  icon,
}: {
  label: string;
  value: string | number;
  highlight?: boolean;
  icon?: React.ReactNode;
}) => (
  <div
    className={`flex items-center space-x-1 ${highlight ? "text-red-500" : "text-foreground/70"} min-w-0`}
  >
    {icon}
    <span className="font-medium flex-shrink-0">{label}:</span>
    <span className="font-mono text-xs min-w-[2rem] text-right">{value}</span>
  </div>
);

export default Footer;
