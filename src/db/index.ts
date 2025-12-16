// src/db/index.ts

import { drizzle } from "drizzle-orm/postgres-js"; // ✅ 只需要从驱动包导入一次
import postgres from "postgres";
import * as schema from "./schema"; // 确保导入了所有的 schema

const connectionString = process.env.DATABASE_URL;

// 1. 严格检查环境变量
if (!connectionString) {
  // 在 Next.js 或打包环境中，直接抛出错误比 console.warn 更安全
  throw new Error("DATABASE_URL 未配置。请检查 .env.local 文件。");
}

// 2. 创建 Postgres 客户端
// ⚠️ 注意：当连接 Supabase Pooler (例如端口 6543) 时，必须使用 { prepare: false }，
// 否则会因为 PGBouncer 不支持 prepared statements 而报错。
// 对于 Supabase/Vercel 环境，这是标准的最佳实践。
export const queryClient = postgres(connectionString, {
  prepare: false,
  // max: 1, // 可选：在 Serverless 环境中，通常将 max 设置为 1
  // idle_timeout: 0, // 可选：关闭空闲连接超时
});

// 3. 创建 Drizzle 实例，并注入你的 Schema
export const db = drizzle(queryClient, { schema });

// 4. 导出 DbInstance 类型，保持类型优雅和复用
export type DbInstance = typeof db;