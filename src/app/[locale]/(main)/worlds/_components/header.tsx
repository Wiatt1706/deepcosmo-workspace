import { Save, Share } from "lucide-react";
import Image from "next/image";
import React from "react";
import { Button } from "@/components/ui/button";

export default async function Header() {
  return (
    <header className="flex z-50 sticky top-0 bg-background border-b h-12 shrink-0 items-center justify-between transition-[width,height] ease-linear">
      {/* 左侧区域 - Logo 和模式切换 */}
      <div className="flex items-center gap-4 px-4">
        <div className="flex items-center">
          <Image
            src="/Matrix Industry Logo.png"
            alt="logo"
            width={160}
            height={21}
            className="mr-6"
          />
        </div>


      </div>

      {/* 右侧区域 - 保存和分享按钮 */}
      <div className="flex items-center gap-2 px-4">
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground hover:text-primary"
        >
          <Share className="h-4 w-4 mr-2" />
          分享
        </Button>
        <Button size="sm" className="gap-2">
          <Save className="h-4 w-4" />
          保存
        </Button>
      </div>
    </header>
  );
}
