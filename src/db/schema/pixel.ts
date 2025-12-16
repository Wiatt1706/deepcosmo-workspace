import { pgTable, text, integer, jsonb, index, boolean } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { user } from "./auth";
import { timestamps } from "./_utils";

export const pixelArts = pgTable("pixel_arts", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  title: text("title").notNull(),
  description: text("description"),
  
  // 核心数据
  canvasData: text("canvas_data").notNull(), // 存储像素点阵 JSON/Base64
  palette: jsonb("palette").$type<string[]>(), // 强类型调色板
  width: integer("width").notNull(),
  height: integer("height").notNull(),
  
  // 状态与统计
  isPublic: boolean("is_public").default(true),
  viewCount: integer("view_count").default(0),
  
  authorId: text("author_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  ...timestamps,
}, (table) => ({
  // 性能优化：Feed流经常按创建时间排序，也经常查询某个作者的作品
  createdIdx: index("idx_art_created").on(table.createdAt),
  authorIdx: index("idx_art_author").on(table.authorId),
}));

// 定义关系，让查询变得优雅
export const pixelArtsRelations = relations(pixelArts, ({ one }) => ({
  author: one(user, {
    fields: [pixelArts.authorId],
    references: [user.id],
  }),
}));