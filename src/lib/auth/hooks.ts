/**
 * 优雅的认证Hooks
 * 提供简洁的React状态管理
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { type User } from "./index";
import apiRoute from "@/lib/services/api-route";

// 认证状态类型
interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
}

/**
 * 主认证Hook - 极简设计
 */
export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    loading: true,
    error: null,
  });

  const router = useRouter();

  // 获取当前用户
  const getCurrentUser = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      
      // 使用统一的API客户端获取用户信息
      const response = await apiRoute.get<{ user?: User }>("/auth/session", {
        showError: false, // 不显示错误提示，避免重复跳转
        handle401: false, // 禁用401自动处理，避免在登录页面显示错误
      });
      setState({ user: response.user || null, loading: false, error: null });
    } catch {
      // 静默处理错误，不显示toast，避免与api-route的错误处理冲突
      setState({
        user: null,
        loading: false,
        error: null, // 不设置错误，避免显示错误信息
      });
    }
  }, []);

  // 登录
  const signIn = useCallback(async (provider: "github" | "google", locale = "zh") => {
    try {
      const response = await apiRoute.get<{ url: string }>(`/auth/login?provider=${provider}&locale=${locale}`);
      // 使用Next.js的router进行导航
      router.push(response.url || "/login");
    } catch (error) {
      const message = error instanceof Error ? error.message : "登录失败";
      toast.error(message);
    }
  }, [router]);

  // 登出
  const signOut = useCallback(async () => {
    try {
      await apiRoute.delete("/auth/session");
      setState({ user: null, loading: false, error: null });
      toast.success("已退出登录");
      router.push("/login");
    } catch (error) {
      const message = error instanceof Error ? error.message : "登出失败";
      toast.error(message);
    }
  }, [router]);

  // 初始化时获取用户信息
  useEffect(() => {
    getCurrentUser();
  }, [getCurrentUser]);

  return {
    ...state,
    signIn,
    signOut,
    refetch: getCurrentUser,
  };
}

/**
 * 认证保护Hook - 自动重定向
 */
export function useAuthGuard(redirectTo = "/login") {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push(redirectTo);
    }
  }, [user, loading, router, redirectTo]);

  return { user, loading, isAuthenticated: !!user };
}

/**
 * 登录状态Hook - 轻量级
 */
export function useAuthStatus() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    // 使用统一的API客户端检查认证状态
    const checkAuthStatus = async () => {
      try {
        await apiRoute.get("/auth/session", {
          showError: false, // 不显示错误提示
          handle401: false, // 禁用401自动处理
        });
        setIsAuthenticated(true);
      } catch {
        setIsAuthenticated(false);
      }
    };

    checkAuthStatus();
  }, []);

  return isAuthenticated;
}
