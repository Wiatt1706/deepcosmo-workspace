import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { headers } from "next/headers";
import { env } from "@/config/env";

export const auth = betterAuth({
  baseURL: env.BETTER_AUTH_URL || env.NEXT_PUBLIC_FRONTEND_BASE_URL,
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: schema, 
  }),
  socialProviders: {
    ...(env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET ? {
      github: {
        clientId: env.GITHUB_CLIENT_ID,
        clientSecret: env.GITHUB_CLIENT_SECRET,
      },
    } : {}),
    ...(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET ? {
      google: {
        clientId: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
      },
    } : {}),
  },
  // 可以添加 user 扩展字段映射
  user: {
    additionalFields: {
      role: {
        type: "string",
        defaultValue: "user"
      }
    }
  }
});

// 封装 getCurrentUser 用于 RSC 和 Server Actions
export const getCurrentUser = async () => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  return session?.user;
};