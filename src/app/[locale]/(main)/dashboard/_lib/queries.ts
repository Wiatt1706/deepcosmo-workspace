import "server-only"

import { db } from "@/db"
import { SystemMenu, systemMenu } from "@/db/schema"
import {
  asc,
} from "drizzle-orm"

import { unstable_cache } from "@/lib/unstable-cache"

export interface SystemMenuWithChildren extends SystemMenu {
  children?: SystemMenu[];
}

export async function getNavMenus() {
  return await unstable_cache(
    async () => {
      try {
        const orderBy = [asc(systemMenu.menuSort)];

        // Fetch all menus
        const allMenus = await db
          .select()
          .from(systemMenu)
          .orderBy(...orderBy);

        const menuMap = new Map<string, SystemMenuWithChildren>();

        allMenus.forEach((menu) => {
          menuMap.set(menu.id, { ...menu, children: [] });
        });

        const rootMenus: SystemMenuWithChildren[] = [];
        const navMainDatas: SystemMenuWithChildren[] = [];
        const projectsDatas: SystemMenuWithChildren[] = [];

        // Establish parent-child relationships
        allMenus.forEach((menu) => {
          if (menu.parentId) {
            const parent = menuMap.get(menu.parentId);
            if (parent) {
              parent.children?.push(menuMap.get(menu.id)!);
            }
          } else {
            rootMenus.push(menuMap.get(menu.id)!);
          }
        });

        // Separate rootMenus into navMainDatas and projectsDatas based on menuType
        rootMenus.forEach((menu) => {
          if (menu.menuType === "0") {
            navMainDatas.push(menu);
          } else if (menu.menuType === "1") {
            projectsDatas.push(menu);
          }
        });

        // Return both datasets
        return {
          data: {
            navMainDatas,
            projectsDatas,
          },
        };
      } catch (error) {
        console.error("Error fetching menus:", error);
        return { data: { navMainDatas: [], projectsDatas: [] } };
      }
    },
    ["JSON.stringify(input)"],
    {
      revalidate: 3600,
      tags: ["navMenu"],
    }
  )();
}
