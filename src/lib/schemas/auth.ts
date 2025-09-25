import { z } from "zod";

// 基础用户信息 schema
export const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string().nullable(),
  avatar: z.string().url().nullable(),
  role: z.enum(["member", "admin", "moderator"]).default("member"),
  emailVerified: z.boolean().default(false),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

// 用户资料 schema
export const ProfileSchema = z.object({
  id: z.string().uuid(),
  displayName: z.string().nullable(),
  bio: z.string().nullable(),
  location: z.string().nullable(),
  website: z.string().url().nullable(),
  preferences: z.object({
    theme: z.enum(["light", "dark", "system"]).optional(),
    language: z.string().optional(),
    notifications: z.boolean().optional(),
  }).nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

// 三方登录提供商
export const OAuthProviderSchema = z.enum(["google", "github", "discord", "twitter"]);

// 三方登录请求 schema
export const OAuthLoginSchema = z.object({
  provider: OAuthProviderSchema,
  redirectTo: z.string().url().optional(),
});

// 三方登录回调 schema
export const OAuthCallbackSchema = z.object({
  code: z.string(),
  state: z.string().optional(),
  error: z.string().optional(),
});

// 会话信息 schema
export const SessionSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string().optional(),
  expiresAt: z.string().datetime(),
  user: UserSchema,
  profile: ProfileSchema.optional(),
});

// API 响应 schema
export const AuthResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    user: UserSchema,
    profile: ProfileSchema.optional(),
    session: z.object({
      accessToken: z.string(),
      refreshToken: z.string().optional(),
      expiresAt: z.string().datetime(),
    }),
  }).optional(),
  error: z.string().optional(),
});

// 用户更新 schema
export const UpdateUserSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  avatar: z.string().url().optional(),
});

// 资料更新 schema
export const UpdateProfileSchema = z.object({
  displayName: z.string().min(1).max(255).optional(),
  bio: z.string().max(500).optional(),
  location: z.string().max(255).optional(),
  website: z.string().url().optional(),
  preferences: z.object({
    theme: z.enum(["light", "dark", "system"]).optional(),
    language: z.string().optional(),
    notifications: z.boolean().optional(),
  }).optional(),
});

// 类型导出
export type User = z.infer<typeof UserSchema>;
export type Profile = z.infer<typeof ProfileSchema>;
export type OAuthProvider = z.infer<typeof OAuthProviderSchema>;
export type OAuthLoginRequest = z.infer<typeof OAuthLoginSchema>;
export type OAuthCallbackRequest = z.infer<typeof OAuthCallbackSchema>;
export type Session = z.infer<typeof SessionSchema>;
export type AuthResponse = z.infer<typeof AuthResponseSchema>;
export type UpdateUserRequest = z.infer<typeof UpdateUserSchema>;
export type UpdateProfileRequest = z.infer<typeof UpdateProfileSchema>;

