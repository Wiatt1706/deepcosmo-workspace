import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_FRONTEND_BASE_URL || "http://localhost:3000",
});

// 导出常用的 Hook，方便组件直接调用
export const { useSession, signIn, signOut } = authClient;