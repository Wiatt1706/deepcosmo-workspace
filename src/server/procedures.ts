import { getCurrentUser } from "@/lib/auth";

type Role = "admin" | "moderator" | "user";

/**
 * 封装一个受保护的 Server Action。
 * @param requiredRole - 必需的角色 (可选，默认'user'表示仅需登录)
 */
export const protectedProcedure = <T extends any[], R>(
  action: (user: NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>, ...args: T) => Promise<R>,
  requiredRole: Role = 'user'
) => {
  return async (...args: T): Promise<{ success: boolean; data?: R; error?: string }> => {
    const user = await getCurrentUser();

    if (!user) {
      return { success: false, error: "Unauthorized: User not logged in." };
    }
    
    // 权限检查
    const roleOrder: Record<Role, number> = { admin: 3, moderator: 2, user: 1 };
    if (roleOrder[user.role as Role] < roleOrder[requiredRole]) {
        return { success: false, error: "Forbidden: Insufficient permissions." };
    }

    try {
      const result = await action(user, ...args);
      return { success: true, data: result };
    } catch (e) {
      console.error(e);
      return { success: false, error: "Internal Server Error" };
    }
  };
};