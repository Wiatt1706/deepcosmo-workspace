import { pgTable, text, timestamp, varchar, uuid, boolean, jsonb } from "drizzle-orm/pg-core";

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



