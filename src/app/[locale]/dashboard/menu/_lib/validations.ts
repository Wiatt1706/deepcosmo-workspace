import { systemMenu, type SystemMenu } from "@/db/schema"
import {
  createSearchParamsCache,
  parseAsInteger,
  parseAsString,
  parseAsStringEnum,
} from "nuqs/server"
import * as z from "zod"

import { getFiltersStateParser, getSortingStateParser } from "@/lib/parsers"

export const searchParamsCache = createSearchParamsCache({
  page: parseAsInteger.withDefault(1),
  perPage: parseAsInteger.withDefault(10),
  sort: getSortingStateParser<SystemMenu>().withDefault([
    {id:"menuSort",desc:false},
  ]),
  title: parseAsString.withDefault(""),
  url: parseAsString.withDefault(""),
  from: parseAsString.withDefault(""),
  to: parseAsString.withDefault(""),
  // advanced filter
  filters: getFiltersStateParser().withDefault([]),
  joinOperator: parseAsStringEnum(["and", "or"]).withDefault("and"),
})

export const createSchema = z.object({
  icon: z.string().optional(),
  title: z.string(),
  url: z.string(),
  menuSort: z.number().optional(),
  isActive: z.boolean().optional(),
  shortcut: z.string().array().optional(),
  menuType: z.enum(systemMenu.menuType.enumValues),
  parentId: z.string().optional(),
})

export const updateSchema = z.object({
  icon: z.string().optional(),
  title: z.string().optional(),
  url: z.string().optional(),
  menuSort: z.number().optional(),
  isActive: z.boolean().optional(),
  menuType: z.enum(systemMenu.menuType.enumValues).optional(),
  shortcut: z.string().array().optional(),
  parentId: z.string().optional(),
})

export const selectSchema = z.object({
  icon: z.string().optional(),
  title: z.string().optional(),
  url: z.string().optional(),
  menuSort: z.number().optional(),
  isActive: z.boolean().optional(),
  menuType: z.enum(systemMenu.menuType.enumValues).optional(),
  parentId: z.string().optional(),
})

export type GetDataSchema = Awaited<ReturnType<typeof searchParamsCache.parse>>
export type CreateDataSchema = z.infer<typeof createSchema>
export type UpdateDataSchema = z.infer<typeof updateSchema>
export type SelectDataSchema = z.infer<typeof selectSchema>
