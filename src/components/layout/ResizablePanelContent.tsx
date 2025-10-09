"use client";

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";

const ResizablePanelContent: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {

  return (
    <ResizablePanelGroup direction="horizontal">
      <ResizablePanel defaultSize={75}>{children}</ResizablePanel>
      <ResizableHandle withHandle />
      <ResizablePanel defaultSize={25} maxSize={50} className="min-w-[300px]">
        <div>TableAi</div>
      </ResizablePanel>
    </ResizablePanelGroup>
  );
};

export default ResizablePanelContent;
