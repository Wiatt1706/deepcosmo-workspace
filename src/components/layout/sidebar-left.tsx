"use client";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar";
import { AudioWaveform, Command, GalleryVerticalEnd } from "lucide-react";
import * as React from "react";
import { TeamSwitcher } from "./team-switcher";
import { NavMain } from "./nav-main";
import { NavProjects } from "./nav-projects";
import { getNavMenus } from "@/app/[locale]/dashboard/_lib/queries";
import { NavUser } from "./nav-user";

const teams = [
  {
    name: "Acme Inc",
    logo: GalleryVerticalEnd,
    plan: "Enterprise",
  },
  {
    name: "Acme Corp.",
    logo: AudioWaveform,
    plan: "Startup",
  },
  {
    name: "Evil Corp.",
    logo: Command,
    plan: "Free",
  },
];

interface AppSidebarProps {
  promises: Promise<[Awaited<ReturnType<typeof getNavMenus>>]>;
}

export default function SidebarLeft({ promises }: AppSidebarProps) {
  const [{ data }] = React.use(promises);

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <TeamSwitcher teams={teams} />
      </SidebarHeader>
      <SidebarContent className="overflow-x-hidden">
        <NavMain items={data.navMainDatas} />
        <NavProjects projects={data.projectsDatas} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
