import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL: process.env.BETTER_AUTH_URL,
});

// 导出常用的 Hook，方便组件直接调用
export const { useSession, signIn, signOut } = authClient;