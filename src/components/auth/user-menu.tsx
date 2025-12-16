/**
 * src/components/layout/user-menu.tsx
 * 优雅的用户菜单组件 - 集成 Better-Auth
 */

"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
// 1. 引入我们封装好的强类型客户端
import { useSession, signOut } from "@/lib/auth-client"; 

export function UserMenu() {
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);

  // 2. 获取会话状态
  // data: session包含 user 和 session 信息
  // isPending: 初始化时检查 cookie 的过程
  const { data: session, isPending } = useSession();

  // 3. 处理初始化加载状态 (防止页面闪烁)
  // 这里可以返回一个 Skeleton 骨架屏，或者简单的 null
  if (isPending) {
    return <div className="h-8 w-32 animate-pulse rounded bg-muted" />;
  }

  // 4. 如果没有 session，说明未登录，显示“去登录”按钮
  if (!session) {
    return (
      <Button onClick={() => router.push("/login")} variant="default" size="sm">
        登录 / 注册
      </Button>
    );
  }

  const user = session.user;

  // 5. 处理登出逻辑
  const handleSignOut = async () => {
    try {
      setIsSigningOut(true);
      await signOut({
        fetchOptions: {
          onSuccess: () => {
            toast.success("已安全退出");
            router.push("/login"); // 或者 router.refresh()
          },
          onError: (ctx) => {
             toast.error(ctx.error.message);
          }
        },
      });
    } catch (error) {
      toast.error("登出时发生意外错误");
    } finally {
      setIsSigningOut(false);
    }
  };

  return (
    <div className="flex items-center space-x-4">
      <div className="flex items-center space-x-2">
        {/* Better-Auth 默认字段是 image，这里做了兼容 */}
        {user.image ? (
          <Image
            src={user.image}
            alt={user.name || "User Avatar"}
            width={32}
            height={32}
            className="h-8 w-8 rounded-full object-cover border border-border"
          />
        ) : (
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center border border-border">
            <span className="text-sm font-medium text-primary">
              {(user.name || user.email || "U").charAt(0).toUpperCase()}
            </span>
          </div>
        )}
        
        <div className="hidden sm:block text-left">
          <p className="text-sm font-medium leading-none">
             {user.name || "未命名用户"}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
             {user.email}
          </p>
        </div>
      </div>

      <Button
        onClick={handleSignOut}
        disabled={isSigningOut}
        variant="outline"
        size="sm"
        className="text-xs"
      >
        {isSigningOut ? (
          <div className="flex items-center space-x-1">
            <div className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
            <span>退出...</span>
          </div>
        ) : (
          "退出"
        )}
      </Button>
    </div>
  );
}