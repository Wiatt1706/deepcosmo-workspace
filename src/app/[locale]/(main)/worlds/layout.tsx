// src/app/editor/layout.tsx
import type { Metadata } from "next";
import ModelSidebar from "./_components/ModelSidebar";
import Footer from "./_components/Footer";
import ModePanel from "./_components/ModePanel";
import { PixelEngineProvider } from "@/components/pixel-engine/PixelContext"; // 引入 Provider

export const metadata: Metadata = {
  title: "编辑器",
  description: "deepcosmo 编辑器页面",
};

export default function EditorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <PixelEngineProvider>
        <div className="user-select-none flex h-screen flex-col overflow-hidden">
          <div className="flex flex-1 overflow-hidden">
            {/* 左侧 Sidebar */}
            <ModelSidebar className="h-[calc(100vh)]" />
            
            {/* 中间主区域 */}
            <main className="bg-background relative flex w-full flex-1 flex-col overflow-hidden">
              {children}
            </main>
            
            {/* 右侧 ModePanel (可选，看设计是否保留) */}
            <ModePanel />
          </div>
          
          {/* 底部 Footer */}
          <Footer />
        </div>
    </PixelEngineProvider>
  );
}