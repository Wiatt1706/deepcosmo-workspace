/**
 * 优雅的认证系统 - 统一入口
 * 基于 Supabase + Drizzle 的极简认证方案
 */

import { createClient } from "@supabase/supabase-js";
import { db } from "@/db";
import { users, profiles } from "@/db/schema";
import "./config-check"; // 自动检查配置

// 类型定义
export interface User {
  id: string;
  email: string;
  name?: string;
  avatar?: string;
  role: "member" | "admin";
}

export interface AuthSession {
  user: User;
  accessToken: string;
  refreshToken?: string;
}

// Supabase 客户端
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }
);

/**
 * 核心认证类 - 极简设计
 */
class AuthService {
  /**
   * 获取OAuth登录URL
   */
  async getOAuthUrl(provider: "github" | "google", redirectTo?: string, _locale = "zh") {
    const baseUrl = process.env.NEXT_PUBLIC_FRONTEND_URL || "http://localhost:3000";
    // 直接重定向到客户端回调页面，让客户端处理hash参数
    const defaultRedirectTo = `${baseUrl}/${_locale}/auth/callback`;

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: redirectTo || defaultRedirectTo,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });

    if (error) throw new Error(`获取${provider}登录链接失败: ${error.message}`);
    return data.url;
  }

  /**
   * 处理OAuth回调 - 支持隐式和授权码流程
   */
  async handleCallback(url: string): Promise<AuthSession> {
    
    // 解析URL参数
    const urlObj = new URL(url);
    
    // 优先从查询参数获取token（更优雅的方式）
    let accessToken = urlObj.searchParams.get("access_token");
    let refreshToken = urlObj.searchParams.get("refresh_token");
    
    
    // 如果没有，尝试从hash中获取token（向后兼容）
    if (!accessToken) {
      const hash = urlObj.hash.substring(1);
      const hashParams = new URLSearchParams(hash);
      accessToken = hashParams.get("access_token");
      refreshToken = hashParams.get("refresh_token");
    }
    
    // 如果还是没有，尝试从查询参数获取code（授权码流程）
    if (!accessToken) {
      const code = urlObj.searchParams.get("code");
      
      if (code) {
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);
        if (error || !data.session) throw new Error("授权码交换失败");
        accessToken = data.session.access_token;
        refreshToken = data.session.refresh_token;
      }
    }

    if (!accessToken) throw new Error("未找到有效的访问令牌");

    // 验证并获取用户信息
    const { data: { user }, error } = await supabase.auth.getUser(accessToken);
    if (error || !user) throw new Error("无效的访问令牌");

    // 自动同步用户到Drizzle
    const syncedUser = await this.syncUser(user);

    return {
      user: syncedUser,
      accessToken,
      refreshToken: refreshToken || undefined,
    };
  }

  /**
   * 验证访问令牌
   */
  async verifyToken(accessToken: string): Promise<User> {
    const { data: { user }, error } = await supabase.auth.getUser(accessToken);
    if (error || !user) throw new Error("无效的访问令牌");
    
    return await this.syncUser(user);
  }

  /**
   * 刷新令牌
   */
  async refreshToken(refreshToken: string): Promise<AuthSession> {
    const { data, error } = await supabase.auth.refreshSession({
      refresh_token: refreshToken,
    });

    if (error || !data.user || !data.session) {
      throw new Error("刷新令牌失败");
    }

    const user = await this.syncUser(data.user);
    return {
      user,
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
    };
  }

  /**
   * 登出
   */
  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw new Error(`登出失败: ${error.message}`);
  }

  /**
   * 自动同步用户到Drizzle - 透明处理
   */
  private async syncUser(supabaseUser: {
    id: string;
    email?: string;
    user_metadata?: Record<string, unknown>;
    app_metadata?: Record<string, unknown>;
  }): Promise<User> {
    const userData = {
      id: supabaseUser.id,
      email: supabaseUser.email || "",
      emailVerified: (supabaseUser.user_metadata?.email_verified as boolean) ?? false,
      name: (supabaseUser.user_metadata?.full_name as string) || 
            (supabaseUser.user_metadata?.name as string) || 
            null,
      avatar: (supabaseUser.user_metadata?.avatar_url as string) || 
              (supabaseUser.user_metadata?.picture as string) || 
              null,
      role: (supabaseUser.app_metadata?.role as "member" | "admin") || "member",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // 插入或更新用户
    await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          email: userData.email,
          emailVerified: userData.emailVerified,
          name: userData.name,
          avatar: userData.avatar,
          updatedAt: userData.updatedAt,
        },
      });

    // 创建或更新用户资料
    const profileData = {
      id: supabaseUser.id,
      displayName: userData.name,
      bio: null,
      location: (supabaseUser.user_metadata?.location as string) || null,
      website: (supabaseUser.user_metadata?.website as string) || null,
      preferences: {
        theme: "system" as const,
        language: "zh",
        notifications: true,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await db
      .insert(profiles)
      .values(profileData)
      .onConflictDoUpdate({
        target: profiles.id,
        set: {
          displayName: profileData.displayName,
          location: profileData.location,
          website: profileData.website,
          updatedAt: profileData.updatedAt,
        },
      });

    return {
      id: userData.id,
      email: userData.email,
      name: userData.name || undefined,
      avatar: userData.avatar || undefined,
      role: userData.role,
    };
  }
}

// 导出单例实例
export const auth = new AuthService();
