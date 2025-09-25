import { eq } from "drizzle-orm";
import { createClient, type User as SupabaseUser, type Session as SupabaseSession, type AuthError } from "@supabase/supabase-js";
import { db } from "@/db";
import { users, profiles, accounts, sessions } from "@/db/schema";
import { 
  User, 
  Profile, 
  Session, 
  OAuthProvider, 
  UpdateUserRequest, 
  UpdateProfileRequest,
  UserSchema,
  ProfileSchema 
} from "@/lib/schemas/auth";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// 创建 Supabase 客户端（可选地携带访问令牌）
const createSupabaseClient = (accessToken?: string) =>
  createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : undefined,
  });

// 从 Supabase 用户数据同步到 Drizzle
export async function syncUserFromSupabase(supabaseUser: SupabaseUser): Promise<User> {
  const { id, email, user_metadata, app_metadata } = supabaseUser;
  
  const userData = {
    id,
    email: email || "",
    name: (user_metadata as Record<string, unknown>)?.full_name as string | null ??
      ((user_metadata as Record<string, unknown>)?.name as string | null) ?? null,
    avatar: (user_metadata as Record<string, unknown>)?.avatar_url as string | null ??
      ((user_metadata as Record<string, unknown>)?.picture as string | null) ?? null,
    emailVerified: (user_metadata as Record<string, unknown>)?.email_verified as boolean ?? false,
    role: (app_metadata as Record<string, unknown>)?.role as "member" | "admin" | undefined ?? "member",
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
        name: userData.name,
        avatar: userData.avatar,
        emailVerified: userData.emailVerified,
        updatedAt: userData.updatedAt,
      },
    });

  // 创建或更新用户资料
  const profileData = {
    id,
    displayName: (user_metadata as Record<string, unknown>)?.full_name as string | null ??
      ((user_metadata as Record<string, unknown>)?.name as string | null) ?? null,
    bio: null,
    location: (user_metadata as Record<string, unknown>)?.location as string | null ?? null,
    website: (user_metadata as Record<string, unknown>)?.website as string | null ?? null,
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

  return UserSchema.parse(userData);
}

// 获取用户完整信息（包括资料）
export async function getUserWithProfile(userId: string): Promise<{ user: User; profile: Profile | null }> {
  const userResult = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  
  if (userResult.length === 0) {
    throw new Error("用户不存在");
  }

  const profileResult = await db.select().from(profiles).where(eq(profiles.id, userId)).limit(1);
  
  const user = UserSchema.parse(userResult[0]);
  const profile = profileResult.length > 0 ? ProfileSchema.parse(profileResult[0]) : null;

  return { user, profile };
}

// 三方登录 - 获取授权 URL
export async function getOAuthUrl(provider: OAuthProvider, redirectTo?: string): Promise<string> {
  const supabase = createSupabaseClient();
  
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: redirectTo || `${process.env.NEXT_PUBLIC_FRONTEND_URL}/auth/callback`,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    },
  });

  if (error) {
    throw new Error(`获取 ${provider} 登录链接失败: ${error.message}`);
  }

  return data.url;
}

// 处理三方登录回调
export async function handleOAuthCallback(
  provider: OAuthProvider,
  code: string
): Promise<Session> {
  const supabase = createSupabaseClient();
  
  type ExchangeResponse = {
    data: { session: SupabaseSession | null; user: SupabaseUser | null };
    error: AuthError | null;
  };
  const authApi = supabase.auth as unknown as {
    exchangeCodeForSession: (arg: string) => Promise<ExchangeResponse>;
  };
  const { data, error } = await authApi.exchangeCodeForSession(code);
  
  if (error) {
    throw new Error(`三方登录失败: ${error.message}`);
  }

  if (!data.user || !data.session) {
    throw new Error("登录响应数据不完整");
  }

  // 同步用户到 Drizzle
  const user = await syncUserFromSupabase(data.user);
  
  // 保存会话信息
  const sessionData = {
    userId: user.id,
    sessionToken: data.session.access_token,
    expires: new Date(data.session.expires_at! * 1000),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  await db
    .insert(sessions)
    .values(sessionData)
    .onConflictDoUpdate({
      target: sessions.sessionToken,
      set: {
        expires: sessionData.expires,
        updatedAt: sessionData.updatedAt,
      },
    });

  // 保存三方账户信息
  if ((data.user.app_metadata as Record<string, unknown>)?.provider) {
    const accountData = {
      userId: user.id,
      provider: (data.user.app_metadata as Record<string, string>).provider,
      providerAccountId: (data.user.app_metadata as Record<string, string>).provider_id || user.id,
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
      expiresAt: new Date(data.session.expires_at! * 1000),
      tokenType: "bearer",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await db
      .insert(accounts)
      .values(accountData)
      .onConflictDoUpdate({
        target: [accounts.userId, accounts.provider, accounts.providerAccountId],
        set: {
          accessToken: accountData.accessToken,
          refreshToken: accountData.refreshToken,
          expiresAt: accountData.expiresAt,
          updatedAt: accountData.updatedAt,
        },
      });
  }

  const { profile } = await getUserWithProfile(user.id);

  return {
    accessToken: data.session.access_token,
    refreshToken: data.session.refresh_token,
    expiresAt: new Date(data.session.expires_at! * 1000).toISOString(),
    user,
    profile: profile || undefined,
  };
}

// 验证访问令牌
export async function verifyAccessToken(accessToken: string): Promise<User> {
  const supabase = createSupabaseClient(accessToken);
  
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) {
    throw new Error("无效的访问令牌");
  }

  // 确保用户已同步到 Drizzle
  return await syncUserFromSupabase(user);
}

// 刷新访问令牌
export async function refreshAccessToken(refreshToken: string): Promise<Session> {
  const supabase = createSupabaseClient();
  
  const { data, error } = await supabase.auth.refreshSession({
    refresh_token: refreshToken,
  });

  if (error || !data.user || !data.session) {
    throw new Error("刷新令牌失败");
  }

  const user = await syncUserFromSupabase(data.user);
  const { profile } = await getUserWithProfile(user.id);

  return {
    accessToken: data.session.access_token,
    refreshToken: data.session.refresh_token,
    expiresAt: new Date(data.session.expires_at! * 1000).toISOString(),
    user,
    profile: profile || undefined,
  };
}

// 登出
export async function signOut(accessToken: string): Promise<void> {
  const supabase = createSupabaseClient(accessToken);
  
  const { error } = await supabase.auth.signOut();
  
  if (error) {
    throw new Error(`登出失败: ${error.message}`);
  }
}

// 更新用户信息
export async function updateUser(userId: string, data: UpdateUserRequest): Promise<User> {
  const updateData = {
    ...data,
    updatedAt: new Date(),
  };

  await db
    .update(users)
    .set(updateData)
    .where(eq(users.id, userId));

  const result = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  return UserSchema.parse(result[0]);
}

// 更新用户资料
export async function updateProfile(userId: string, data: UpdateProfileRequest): Promise<Profile> {
  const updateData = {
    ...data,
    updatedAt: new Date(),
  };

  await db
    .update(profiles)
    .set(updateData)
    .where(eq(profiles.id, userId));

  const result = await db.select().from(profiles).where(eq(profiles.id, userId)).limit(1);
  return ProfileSchema.parse(result[0]);
}

