import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";

const connectionString = process.env.DATABASE_URL || "";

if (!connectionString) {
  console.warn("DATABASE_URL 未配置，drizzle 将无法连接数据库");
}

export const queryClient = postgres(connectionString, { prepare: false });
export const db = drizzle(queryClient);

export type DbInstance = typeof db;



