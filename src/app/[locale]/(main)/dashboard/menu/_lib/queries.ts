import "server-only"

import { db } from "@/db"
import { SystemMenu, systemMenu } from "@/db/schema"
import {
  asc,
  desc,
} from "drizzle-orm"

import { filterColumns } from "@/lib/filter-columns"
import { unstable_cache } from "@/lib/unstable-cache"

import { type GetDataSchema } from "./validations"

export interface SystemMenuWithChildren extends SystemMenu {
  children: SystemMenu[];
}

export async function getSystemMenusWithChildren(input: GetDataSchema) {
  return await unstable_cache(
    async () => {
      try {
        const { page, perPage, filters, joinOperator, sort } = input;
        const offset = (page - 1) * perPage;

        const where = filterColumns({
          table: systemMenu,
          filters,
          joinOperator,
        });

        const orderBy =
          sort.length > 0
            ? sort.map(({ id, desc: isDesc }) =>
                isDesc ? desc(systemMenu[id]) : asc(systemMenu[id])
              )
            : [asc(systemMenu.menuSort)];

        // Fetch all menus
        const allMenus = await db
          .select()
          .from(systemMenu)
          .where(where)
          .orderBy(...orderBy);

        // Build nested structure
        const menuMap = new Map<string, SystemMenuWithChildren>();

        // Initialize menuMap with all menus
        allMenus.forEach((menu) => {
          menuMap.set(menu.id, { ...menu, children: [] });
        });

        const rootMenus: SystemMenuWithChildren[] = [];

        // Establish parent-child relationships
        allMenus.forEach((menu) => {
          if (menu.parentId) {
            const parent = menuMap.get(menu.parentId);
            if (parent) {
              parent.children.push(menuMap.get(menu.id)!);
            }
          } else {
            rootMenus.push(menuMap.get(menu.id)!);
          }
        });

        // Pagination
        const paginatedMenus = rootMenus.slice(offset, offset + perPage);
        const pageCount = Math.ceil(rootMenus.length / perPage);

        return { data: paginatedMenus, pageCount };
      } catch (error) {
        console.error("Error fetching menus:", error);
        return { data: [], pageCount: 0 };
      }
    },
    [JSON.stringify(input)],
    {
      revalidate: 3600,
      tags: ["systemMenu"],
    }
  )();
}
