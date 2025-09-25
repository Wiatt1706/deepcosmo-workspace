import { pgTable, serial, text, timestamp, varchar, uuid, boolean, jsonb } from "drizzle-orm/pg-core";

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

// 三方登录账户表
export const accounts = pgTable("accounts", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  provider: varchar("provider", { length: 50 }).notNull(), // google, github, etc.
  providerAccountId: varchar("provider_account_id", { length: 255 }).notNull(),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  expiresAt: timestamp("expires_at"),
  tokenType: varchar("token_type", { length: 50 }),
  scope: text("scope"),
  idToken: text("id_token"),
  sessionState: text("session_state"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// 用户会话表
export const sessions = pgTable("sessions", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  sessionToken: varchar("session_token", { length: 255 }).notNull().unique(),
  expires: timestamp("expires").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});



