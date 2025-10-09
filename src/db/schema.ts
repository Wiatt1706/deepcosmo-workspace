import { pgTable, text, timestamp, varchar, uuid, boolean, jsonb, integer } from "drizzle-orm/pg-core";

// 用户表 - 与 Supabase Auth 用户关联
export const users = pgTable("users", {
  id: uuid("id").primaryKey(), // 使用 Supabase Auth 的 UUID
  email: varchar("email", { length: 255 }).notNull().unique(),
  emailVerified: boolean("email_verified").default(false),
  name: varchar("name", { length: 255 }),
  avatar: text("avatar"),
  role: varchar("role", { length: 64 }).default("member"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// 用户资料表 - 扩展信息
export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  displayName: varchar("display_name", { length: 255 }),
  bio: text("bio"),
  location: varchar("location", { length: 255 }),
  website: text("website"),
  preferences: jsonb("preferences").$type<{
    theme?: "light" | "dark" | "system";
    language?: string;
    notifications?: boolean;
  }>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// 系统菜单表
export const systemMenu = pgTable("system_menu", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: varchar("title", { length: 255 }).notNull(),
  url: varchar("url", { length: 1024 }),
  icon: varchar("icon", { length: 255 }),
  shortcut: text("shortcut").array(),
  isActive: boolean("is_active").default(false).notNull(),
  parentId: uuid("parent_id"),
  menuType: varchar("menu_type", { length: 30, enum: ["0", "1"] }).notNull().default("0"),
  menuSort: integer("menu_sort").default(0).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }).defaultNow(),
});

export type SystemMenu = typeof systemMenu.$inferSelect;