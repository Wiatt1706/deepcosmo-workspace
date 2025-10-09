import React from "react";
import { SidebarTrigger } from "../ui/sidebar";
import { Separator } from "../ui/separator";
import { Breadcrumbs } from "../breadcrumbs";
import { UserMenu } from "../auth/user-menu";

export default function DashboardHeader() {
  return (
    <header className="flex z-50 sticky top-0 bg-background border-b h-12 shrink-0 items-center justify-between gap-2 transition-[width,height] ease-linear ">
      <div className="flex items-center gap-2 px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <Breadcrumbs />
      </div>

      <div className="flex items-center gap-2 px-4">
        <UserMenu />
      </div>
    </header>
  );
}
