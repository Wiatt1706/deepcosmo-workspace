import { pgTable, text, primaryKey, index } from "drizzle-orm/pg-core";
import { user } from "./auth";
import { pixelArts } from "./pixel";
import { timestamps } from "./_utils";

// 点赞表 (多对多关联)
export const likes = pgTable("likes", {
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  artId: text("art_id").notNull().references(() => pixelArts.id, { onDelete: "cascade" }),
  ...timestamps,
}, (table) => ({
  // 复合主键：防止重复点赞
  pk: primaryKey({ columns: [table.userId, table.artId] }),
  // 索引：查询“我赞过的作品”
  userIdx: index("idx_like_user").on(table.userId),
}));

// 评论表
export const comments = pgTable("comments", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  content: text("content").notNull(),
  authorId: text("author_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  artId: text("art_id").notNull().references(() => pixelArts.id, { onDelete: "cascade" }),
  ...timestamps,
}, (table) => ({
  artIdx: index("idx_comment_art").on(table.artId), // 快速加载作品下的评论
}));