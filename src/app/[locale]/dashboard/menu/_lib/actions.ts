"use server"

import { revalidateTag, unstable_noStore } from "next/cache"
import { db } from "@/db/index"
import { systemMenu, type SystemMenu } from "@/db/schema"
import { and, asc, eq, ilike, inArray } from "drizzle-orm"
import { getErrorMessage } from "@/lib/handle-error"
import type { CreateDataSchema, SelectDataSchema, UpdateDataSchema } from "./validations"
import { SystemMenuWithChildren } from "./queries"

export async function createSystemMenu(input: CreateDataSchema) {
	unstable_noStore();
	try {
		const sanitizedInput = {
			...input,
			parentId: input.parentId || null,
		};
		
		let newMenu;
		await db.transaction(async (tx) => {
			newMenu = await tx
				.insert(systemMenu)
				.values({
					title: sanitizedInput.title,
					url: sanitizedInput.url,
					icon: sanitizedInput.icon,
					shortcut: sanitizedInput.shortcut,
					isActive: sanitizedInput.isActive, // 使用驼峰命名
					menuType: sanitizedInput.menuType,
					menuSort: sanitizedInput.menuSort,
					parentId: sanitizedInput.parentId,
				}).returning();
		});

		revalidateTag("systemMenu");
		revalidateTag("navMenu");

		return {
			data: newMenu,
			error: null,
		};
	} catch (err) {
		return {
			data: null,
			error: getErrorMessage(err),
		};
	}
}


export async function updateSystemMenu(input: UpdateDataSchema & { id: string }) {
	unstable_noStore()
	try {
		const sanitizedInput = {
			...input,
			parentId: input.parentId || null,
		};
		
		const data = await db
			.update(systemMenu)
			.set({
				title: sanitizedInput.title,
				url: sanitizedInput.url,
				menuSort: sanitizedInput.menuSort,
				isActive: sanitizedInput.isActive,
				icon: sanitizedInput.icon,
				shortcut: sanitizedInput.shortcut,
				menuType: sanitizedInput.menuType,
				parentId: sanitizedInput.parentId,
			})
			.where(eq(systemMenu.id, input.id)).returning()

		revalidateTag("systemMenu")
		revalidateTag("navMenu")

		return {
			data: data,
			error: null,
		}
	} catch (err) {
		return {
			data: null,
			error: getErrorMessage(err),
		}
	}
}

export async function updateSystemMenus(input: {
	ids: string[]
	isActive?: SystemMenu["isActive"]
	parentId?: SystemMenu["parentId"]
	menuType?: SystemMenu["menuType"]
		}) {
	unstable_noStore()
	try {
		const data = await db
		.update(systemMenu)
		.set({
			isActive: input.isActive,
			parentId: input.parentId,
			menuType: input.menuType,
		})
		.where(inArray(systemMenu.id, input.ids))

			revalidateTag("systemMenu")
			revalidateTag("navMenu")

			return {
		data: null,
		error: null,
			}
	} catch (err) {
		return {
			data: null,
			error: getErrorMessage(err),
		}
	}
}


export async function deleteSystemMenu(input: { id: string }) {
	unstable_noStore()
	try {
		await db.transaction(async (tx) => {
			await tx.delete(systemMenu).where(eq(systemMenu.id, input.id))
		})

		revalidateTag("systemMenu")
		revalidateTag("navMenu")

		return {
			data: null,
			error: null,
		}
	} catch (err) {
		return {
			data: null,
			error: getErrorMessage(err),
		}
	}
}

export async function deleteSystemMenus(input: { ids: string[] }) {
	unstable_noStore()
	try {
		await db.transaction(async (tx) => {
			await tx.delete(systemMenu).where(inArray(systemMenu.id, input.ids))
		})

		revalidateTag("systemMenu")
		revalidateTag("navMenu")

		return {
			data: null,
			error: null,
		}
	} catch (err) {
		return {
			data: null,
			error: getErrorMessage(err),
		}
	}
}


export async function getMenusWithChildrenByAi(input: SelectDataSchema) {
	unstable_noStore();
	try {

		const { icon, title, url, menuSort, isActive, menuType, parentId } = input;

		const where = and(
			icon ? ilike(systemMenu.icon, `%${icon}%`) : undefined,
			title ? ilike(systemMenu.title, `%${title}%`) : undefined,
			url ? ilike(systemMenu.url, `%${url}%`) : undefined,
			menuSort ? eq(systemMenu.menuSort, menuSort) : undefined,
			isActive ? eq(systemMenu.isActive, isActive) : undefined,
			menuType ? eq(systemMenu.menuType, menuType) : undefined,
			parentId ? eq(systemMenu.parentId, parentId) : undefined
		);

		const orderBy = [asc(systemMenu.menuSort)];

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

		return { data: rootMenus, error: null };

	} catch (err) {
		return {
			data: null,
			error: getErrorMessage(err),
		};
	}
}

