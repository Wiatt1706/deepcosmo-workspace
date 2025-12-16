import { SidebarInset, SidebarMenuSkeleton, SidebarProvider } from "@/components/ui/sidebar";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { getNavMenus } from "./_lib/queries";
import { Suspense } from "react";
import SidebarLeft from "@/components/layout/sidebar-left";
import { AiboardProvider } from "@/components/AiboardProvider";
import ResizablePanelContent from "@/components/layout/ResizablePanelContent";
import DashboardHeader from "@/components/layout/dashboard-header";

export const metadata: Metadata = {
  title: "Next Shadcn Dashboard Starter",
  description: "Basic dashboard with Next.js and Shadcn",
};

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Persisting the sidebar state in the cookie.
  const cookieStore = await cookies();
  const defaultOpen = cookieStore.get("sidebar:state")?.value === "true";

  const promises = Promise.all([
    getNavMenus(),
  ]);

  return (
    <AiboardProvider>
      <SidebarProvider defaultOpen={defaultOpen}>
        <Suspense fallback={<SidebarMenuSkeleton showIcon={true} />}>
          <SidebarLeft promises={promises} />
        </Suspense>
        <SidebarInset>
          <DashboardHeader />
          <ResizablePanelContent>{children}</ResizablePanelContent>
        </SidebarInset>
      </SidebarProvider>
    </AiboardProvider>
  );
}
