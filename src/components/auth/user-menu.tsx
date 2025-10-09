/**
 * 优雅的用户菜单组件
 */

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuthContext } from "./auth-provider";
import { toast } from "sonner";

export function UserMenu() {
  const { user, signOut } = useAuthContext();
  const [loading, setLoading] = useState(false);

  if (!user) return null;

  const handleSignOut = async () => {
    try {
      setLoading(true);
      await signOut();
    } catch {
      toast.error("登出失败，请重试");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center space-x-4">
      <div className="flex items-center space-x-2">
        {user.avatar ? (
          <img
            src={user.avatar}
            alt={user.name || user.email}
            className="h-8 w-8 rounded-full"
          />
        ) : (
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="text-sm font-medium text-primary">
              {(user.name || user.email).charAt(0).toUpperCase()}
            </span>
          </div>
        )}
        <div className="hidden sm:block">
          <p className="text-sm font-medium">{user.name || user.email}</p>
          <p className="text-xs text-muted-foreground">{user.email}</p>
        </div>
      </div>

      <Button
        onClick={handleSignOut}
        disabled={loading}
        variant="outline"
        size="sm"
      >
        {loading ? (
          <div className="flex items-center space-x-1">
            <div className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
            <span>退出中...</span>
          </div>
        ) : (
          "退出登录"
        )}
      </Button>
    </div>
  );
}
