import type { Metadata } from "next";
import ModelSidebar from "./_components/ModelSidebar";
import Footer from "./_components/Footer";
import ModePanel from "./_components/ModePanel";

export const metadata: Metadata = {
  title: "编辑器",
  description: "deepcosmo 编辑器页面",
};

export default async function EditorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="user-select-none">
      <div
        className="flex"
      >
        <ModelSidebar className="h-[calc(100vh)]" />
        <main className="bg-background relative flex w-full flex-1 flex-col h-[calc(100vh)] overflow-hidden">
          {children}
        </main>
        <ModePanel />
      </div>
      <Footer />
    </div>
  );
}
