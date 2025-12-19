import { Settings } from "lucide-react"; // 引入设置图标
import React from "react";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button"; // 引入按钮组件

export default function HeaderTool() {
  return (
    <header className="bg-background sticky top-0 flex shrink-0 items-center gap-2 border-b h-12 px-2 z-10">
      {/* 左侧导航和面包屑 */}
      <div className="flex items-center flex-1 ml-2">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem className="hidden md:block">
              <BreadcrumbLink href="#">项目名称</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator className="hidden md:block" />
            <BreadcrumbItem>
              <BreadcrumbPage>一级场景</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      {/* 右侧设置按钮 */}

      <Button
        variant="secondary"
        size="icon"
        className="size-8 shadow-none hover:bg-muted"
      >
        <Settings className="h-4 w-4" />
      </Button>
    </header>
  );
}
