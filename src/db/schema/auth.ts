import { pgTable, text, boolean, index, timestamp, unique } from "drizzle-orm/pg-core";
import { timestamps } from "./_utils";

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull(),
  image: text("image"),
  role: text("role").default("user").notNull(), // 'user' | 'admin' | 'mod'
  isBanned: boolean("is_banned").default(false), // 账号封禁状态
  bio: text("bio"),
  ...timestamps,
}, (table) => ({
  // 索引优化：经常按邮箱查找用户
  emailIdx: index("idx_user_email").on(table.email), 
}));

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  ...timestamps,
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  scope: text("scope"),
  expiresAt: timestamp("expires_at"),
  password: text("password"),
  ...timestamps,
}, (table) => ({
  // 唯一约束：每个用户每个提供商只能有一个账户
  accountProviderUnique: unique("idx_account_provider_unique").on(table.userId, table.providerId),
}));

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  ...timestamps,
});