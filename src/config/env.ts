import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  /**
   * 服务器端环境变量
   */
  server: {
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    DATABASE_URL: z.string().url(),
    MD5_SALT_KEY: z.string().optional(),
    
    // Better Auth 配置
    BETTER_AUTH_URL: z.string().url().optional(),
    
    // OAuth 认证配置
    GITHUB_CLIENT_ID: z.string().optional(),
    GITHUB_CLIENT_SECRET: z.string().optional(),
    GOOGLE_CLIENT_ID: z.string().optional(),
    GOOGLE_CLIENT_SECRET: z.string().optional(),
  },

  /**
   * 客户端环境变量 - 注意：所有客户端变量都需要以 NEXT_PUBLIC_ 开头
   */
  client: {
    // API配置
    NEXT_PUBLIC_API_BASE_URL: z.string().url().default("http://10.1.1.11:8798"),
    NEXT_PUBLIC_FRONTEND_BASE_URL: z.string().url().default("http://localhost:3000"),
    NEXT_PUBLIC_API_ROUTE_URL: z.string().default("/api"),
    NEXT_PUBLIC_AUTH_SERVICE_URL: z.string().default(""),
    
    // WebSocket配置
    NEXT_PUBLIC_WS_URL: z.string().url().default("wss://ws.matind.com/ws"),
    
    // 其他客户端配置
    NEXT_PUBLIC_API_KEY: z.string().default(""),
  },

  /**
   * 运行时环境变量映射
   */
  runtimeEnv: {
    // 服务器端变量
    NODE_ENV: process.env.NODE_ENV,
    DATABASE_URL: process.env.DATABASE_URL,
    MD5_SALT_KEY: process.env.MD5_SALT_KEY || process.env.NEXT_PUBLIC_API_KEY,
    BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
    GITHUB_CLIENT_ID: process.env.GITHUB_CLIENT_ID,
    GITHUB_CLIENT_SECRET: process.env.GITHUB_CLIENT_SECRET,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    
    // 客户端变量
    NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
    NEXT_PUBLIC_FRONTEND_BASE_URL: process.env.NEXT_PUBLIC_API_USER || process.env.NEXT_PUBLIC_FRONTEND_BASE_URL,
    NEXT_PUBLIC_API_ROUTE_URL: process.env.NEXT_PUBLIC_API_ROUTE_URL,
    NEXT_PUBLIC_AUTH_SERVICE_URL: process.env.NEXT_PUBLIC_AUTH_SERVICE_URL,
    NEXT_PUBLIC_WS_URL: process.env.WS_URL || process.env.NEXT_PUBLIC_WS_URL,
    NEXT_PUBLIC_API_KEY: process.env.NEXT_PUBLIC_API_KEY,
  },

  /**
   * 可选配置
   */
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  emptyStringAsUndefined: true,
});

// 为了向后兼容，可以导出一些辅助函数或计算属性
export const isProd = env.NODE_ENV === "production";

// 如果需要，可以创建一个与原配置类似的对象
export const envConfig = {
  API_BASE_URL: env.NEXT_PUBLIC_API_BASE_URL,
  FRONTEND_BASE_URL: env.NEXT_PUBLIC_FRONTEND_BASE_URL,
  API_ROUTE_URL: env.NEXT_PUBLIC_API_ROUTE_URL,
  AUTH_SERVICE_URL: env.NEXT_PUBLIC_AUTH_SERVICE_URL,
  isProd,
  MD5_SALT_KEY: env.MD5_SALT_KEY || env.NEXT_PUBLIC_API_KEY,
  WS_URL: env.NEXT_PUBLIC_WS_URL,
  // 数据库连接（仅服务器端可用）
  DATABASE_URL: env.DATABASE_URL,
};

export default envConfig;