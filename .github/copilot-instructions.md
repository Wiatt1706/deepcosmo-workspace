# 🤖 DeepCosmo AI 编码指南

> 本文档专为 AI 代码助手设计，提供快速上下文与约束条件。
> 在实现任何功能前，请完整阅读本节。

---

## 核心约束（黄金法则）

1. **技术栈锁定** - 只用现有栈，不引入新库：
   - 前端：Next.js 15 + React 19 + TypeScript
   - 认证：Better Auth（与 Drizzle 适配器集成）
   - 数据库：Drizzle ORM + PostgreSQL（Neon/Supabase）
   - 状态：Zustand（可选），SWR（数据获取）
   - HTTP：Axios（通过 `src/lib/services/api-route.ts`）
   - 国际化：next-intl（支持 zh/en/ja/ko）
   - 样式：Tailwind CSS v4 + Shadcn/ui

2. **禁止清单**（违反即拒绝）：
   - ❌ 原生 `fetch` 或直接 `axios`（只用 `apiRoute`）
   - ❌ 直接 `document`/`window`（客户端组件判空后再用）
   - ❌ 服务端组件使用客户端 Hook（useEffect、useState、useAuth 等）
   - ❌ 在组件中使用 `any`（无法避免时加注释说明原因）
   - ❌ 修改认证主流程或在 Drizzle schema 中添加认证表
   - ❌ 直接在数据库控制台修改结构（必须通过 Drizzle migration）

3. **架构第一** - 所有变更需保持一致性：
   - 数据库变更 → Schema（TS） → 迁移（SQL） → 一起提交
   - 页面增加 → 遵循 `_lib/_components` 目录结构
   - 新表创建 → 需在 PR 中说明业务必要性

---

## 项目结构与关键路径

### 核心目录
```
src/
├── app/
│   ├── [locale]/              # 国际化路由
│   │   ├── <page>/
│   │   │   ├── _lib/          # 逻辑层（actions.ts, queries.ts, validations.ts）
│   │   │   ├── _components/   # UI 组件层
│   │   │   └── page.tsx       # 页面入口
│   │   ├── error.tsx          # 错误页
│   │   ├── layout.tsx         # 布局
│   │   └── (auth)/callback    # 认证回调路由
│   └── api/auth/              # Better Auth 路由
├── components/                # 全局可复用组件
│   ├── layout/                # 布局组件（Navbar, Sidebar 等）
│   └── ui/                    # Shadcn/ui 原始组件
├── db/
│   ├── index.ts               # Drizzle 客户端
│   ├── schema/                # 表定义（领域拆分）
│   │   ├── _utils.ts          # 通用字段（timestamps）
│   │   ├── auth.ts            # Better Auth 表（自动生成）
│   │   ├── pixel.ts           # 业务表示例
│   │   └── social.ts          # 业务表示例
│   └── utils.ts               # 数据库工具
├── lib/
│   ├── auth.ts                # Better Auth 配置（服务端）
│   ├── auth-client.ts         # 客户端认证 Hooks
│   ├── services/
│   │   └── api-route.ts       # HTTP 客户端（强制使用）
│   ├── hooks/                 # 共享 hooks
│   └── utils.ts               # 通用工具
├── i18n/                      # 国际化配置
├── types/                     # 全局类型定义
├── config/env.ts              # 环境变量配置（@t3-oss/env-nextjs）
├── middleware.ts              # 路由保护 + 国际化
└── messages/                  # 国际化翻译

drizzle/                       # Drizzle 迁移与快照（自动生成，勿手动编辑）
```

### 关键文件说明
- `src/lib/services/api-route.ts` - HTTP 请求统一入口，带错误处理、自动401跳转、toast通知
- `src/lib/auth.ts` - Better Auth 服务端配置，支持 GitHub/Google OAuth
- `src/lib/auth-client.ts` - 客户端认证 Hooks
- `src/db/schema/_utils.ts` - 通用字段（timestamps, createdAt, updatedAt）
- `src/config/env.ts` - 环境变量验证（Zod）与导出
- `src/middleware.ts` - 路由保护与国际化中间件
- `drizzle.config.ts` - Drizzle 配置
- `next.config.ts` - Next.js 配置

---

## HTTP 请求模式

### ✅ 正确（强制）
```ts
import apiRoute from "@/lib/services/api-route";

// GET
const data = await apiRoute.get<ResponseType>("/path", { handle401: false });

// POST
const result = await apiRoute.post<ResponseType>("/path", { body: {...} });

// PUT / DELETE
const updated = await apiRoute.put<ResponseType>("/path", { body: {...} });
const deleted = await apiRoute.delete<ResponseType>("/path");

// 可选参数
{
  showError?: boolean;           // 是否显示错误提示（默认 true）
  handle401?: boolean;           // 是否自动处理 401 跳转登录（默认 true）
  customErrorHandler?: (e) => void; // 自定义错误处理
}
```

### 错误处理自动化
- 所有错误自动通过 `toast` 显示
- 401 自动清除 token 并跳转至登录页（当前语言）
- 4xx/5xx 显示相应的错误信息（从响应 `msg` 字段读取）
- 网络错误显示"无法连接服务器"

### ❌ 错误（禁止）
```ts
fetch("/api/path")              // 禁止原生 fetch
fetch("http://...")             // 禁止直接调 HTTP
axios.get(...)                  // 禁止直接用 axios
import axios from "axios"       // 禁止直接导入 axios
```

---

## 认证与 Better Auth

### 工作流程
**登录：**
```
1. 客户端：useAuth().signIn(provider, options?)
2. 重定向到 OAuth 提供商（GitHub/Google）
3. OAuth 回调到 /[locale]/auth/callback#access_token=...
```

**回调处理：**
```
1. 客户端页面解析 hash 中的 access_token
2. Better Auth 验证 token 并创建会话
3. 自动设置 session cookie
4. 重定向到 /dashboard
```

**登出：**
```
1. 客户端：useAuth().signOut()
2. 清除 session cookies
3. 重定向到 /login
```

**获取当前用户：**
```ts
// 服务端（RSC 或 Server Action）
import { getCurrentUser } from "@/lib/auth";
const user = await getCurrentUser();

// 客户端组件
"use client";
import { useAuth } from "@/lib/auth-client";
export function MyComponent() {
  const { user, isLoading } = useAuth();
  if (isLoading) return <div>Loading...</div>;
  return <div>{user?.email}</div>;
}
```

### 会话与 Cookies
- Better Auth 自动管理 session cookies（sessionToken）
- 所有来自 `apiRoute` 的请求自动包含 access_token header
- 401 响应自动清除 token 并跳转登录

---

## 页面与数据流模式

### 固定目录结构
```
app/[locale]/my-page/
├── _lib/
│   ├── actions.ts      # Server Actions（写操作）
│   ├── queries.ts      # 数据库/远程查询（读操作）
│   ├── hooks.ts        # 页面私有 hooks（客户端）
│   └── validations.ts  # Zod schema + 导出类型
├── _components/
│   ├── PageClient.tsx  # "use client" 组件
│   └── ...
└── page.tsx            # 服务端组件（组合层）
```

### 数据流最佳实践
```ts
// 1. _lib/validations.ts（Zod 真源）
import { z } from "zod";
export const profileSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
});
export type Profile = z.infer<typeof profileSchema>;

// 2. _lib/queries.ts（服务端读操作）
import { db } from "@/db";
export async function getProfile(userId: string) {
  return await db.query.profiles.findFirst({
    where: eq(profiles.userId, userId),
  });
}

// 3. _lib/actions.ts（服务端写操作）
"use server";
import { revalidatePath } from "next/cache";
import { profileSchema } from "./validations";
export async function updateProfile(userId: string, input: unknown) {
  const data = profileSchema.parse(input);
  await db.update(profiles).set(data).where(eq(profiles.userId, userId));
  revalidatePath("/profile");
}

// 4. _lib/hooks.ts（客户端）
"use client";
import useSWR from "swr";
import apiRoute from "@/lib/services/api-route";
export function useProfileSummary(userId: string) {
  const { data, error } = useSWR(
    `/api/profile/${userId}/summary`,
    (url) => apiRoute.get(url)
  );
  return { summary: data, loading: !error && !data, error };
}

// 5. _components/Client.tsx（客户端展示）
"use client";
import { useProfileSummary } from "../_lib/hooks";
export function ProfileClient({ profile }: { profile: Profile }) {
  const { summary } = useProfileSummary(profile.userId);
  return (
    <div>
      <h1>{profile.name}</h1>
      <p>Posts: {summary?.postCount}</p>
    </div>
  );
}

// 6. page.tsx（服务端组合）
import { getCurrentUser } from "@/lib/auth";
import { getProfile } from "./_lib/queries";
import { ProfileClient } from "./_components/Client";
import { redirect } from "next/navigation";

export default async function Page() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  
  const profile = await getProfile(user.id);
  return <ProfileClient profile={profile} />;
}
```

---

## 数据库与迁移 SOP

### 快速命令
```bash
pnpm run db:generate    # 生成迁移（本地分析，无连接）
pnpm run db:migrate     # 应用迁移到数据库
pnpm run db:push        # 强制同步（仅本地原型，禁用于生产）
pnpm run db:studio      # 打开 Drizzle Studio（可视化编辑）
```

### Schema 修改流程
1. **编辑** `src/db/schema/` 中的表定义（TS）
2. **生成** `pnpm run db:generate`
3. **检查** `drizzle/` 下新 SQL 无异常
4. **应用** `pnpm run db:migrate`
5. **提交** 同时提交 Schema + 迁移文件

### 命名规范
- 表名：复数、snake_case（`pixel_arts`, `users`）
- 列名：snake_case（`created_at`, `is_featured`）
- TS 字段：camelCase（`createdAt`, `isFeatured`）
- 主键：使用 UUID（`id: text("id").primaryKey()`）
- 软删除：`deletedAt: timestamp("deleted_at")`
- 时间戳：使用 `...timestamps` 从 `_utils.ts` 导入

### Schema 示例（src/db/schema/pixel.ts）
```ts
import { pgTable, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { timestamps } from "./_utils";

export const pixelArts = pgTable("pixel_arts", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  userId: text("user_id").notNull(),
  isFeatured: boolean("is_featured").default(false),
  ...timestamps,
});
```

---

## 路由保护与中间件

### 路由配置（src/middleware.ts）
项目使用 Next.js 中间件进行路由保护。配置分三类：

1. **公开路由** - 无需认证
   - `/`, `/login`, `/editor/*`, `/about`, `/privacy`, `/api/auth/*` 等

2. **受保护路由** - 需要活跃会话
   - `/dashboard/*`, `/profile/*`, `/settings/*`, `/workspace/*` 等

3. **排除规则** - 即使匹配受保护模式也允许访问
   - `/dashboard/public`, `/product/public` 等

### 国际化路由处理
- 所有路由均在 `[locale]` 命名空间下（支持 zh/en/ja/ko）
- 优先使用 `NEXT_LOCALE` cookie，未设置则使用默认语言 `zh`
- 根路径 `/` 自动跳转到 `/<locale>/`
- 切换语言：使用 `LocaleSwitcher` 或手动设置 `NEXT_LOCALE` cookie

---

## 类型安全与 Zod

### Zod 作为真源
```ts
// validations.ts
import { z } from "zod";

export const userSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  role: z.enum(["admin", "user"]),
  createdAt: z.date(),
});

export type User = z.infer<typeof userSchema>;
```

### 验证与转换
```ts
// actions.ts
"use server";
import { userSchema } from "./validations";

export async function updateUser(input: unknown) {
  // 方法1：严格模式（失败抛异常）
  const parsed = userSchema.parse(input);
  
  // 方法2：安全模式（捕获错误）
  const result = userSchema.safeParse(input);
  if (!result.success) {
    return { error: result.error.flatten() };
  }
  
  await db.update(users).set(result.data).where(eq(users.id, result.data.id));
}
```

---

## 国际化

### 支持语言
- `zh` - 中文（默认）
- `en` - 英文
- `ja` - 日文
- `ko` - 韩文

### 使用翻译
```tsx
// 服务端组件
import { getTranslations } from "next-intl/server";
export default async function Page() {
  const t = await getTranslations("PageName");
  return <h1>{t("title")}</h1>;
}

// 客户端组件
"use client";
import { useTranslations } from "next-intl";
export function Client() {
  const t = useTranslations("PageName");
  return <h1>{t("title")}</h1>;
}
```

---

## Do & Don't（快速决策）

### ✅ 应该做
- 使用 `apiRoute.get/post()` 发请求
- 在客户端组件中判空后再用浏览器 API
- 受保护页面通过 middleware 检查
- 新页面遵循 `_lib/_components` 结构
- Server Action 中进行数据验证和权限检查
- Schema 变更包含迁移文件一起提交
- 在 TypeScript 中充分利用类型（避免 any）

### ❌ 不应该做
- 用原生 `fetch` 或 `axios`
- 在服务端组件直接使用 `useEffect/useState/useAuth`
- 直接在数据库控制台修改表结构
- 创建多余的数据库表（讨论业务必要性）
- 改动认证主流程或 Better Auth schema
- 使用 `any`（无法避免时加注释）
- 跳过 Zod 验证

---

## 常见代码片段

### Server Action 标准模式
```ts
"use server";
import { revalidatePath } from "next/cache";

export async function myAction(formData: FormData) {
  // 1. 获取当前用户
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  
  // 2. 验证输入
  const data = Object.fromEntries(formData);
  const validated = mySchema.parse(data);
  
  // 3. 权限检查
  const resource = await db.query.items.findFirst({
    where: eq(items.id, validated.id),
  });
  if (resource?.userId !== user.id) throw new Error("Forbidden");
  
  // 4. 执行操作
  await db.update(items).set(validated).where(eq(items.id, validated.id));
  
  // 5. 重新验证缓存
  revalidatePath("/items");
  
  return { success: true };
}
```

### 获取当前会话
```ts
// 服务端
const user = await getCurrentUser();
if (!user) redirect("/login");

// 客户端
"use client";
const { user, isLoading } = useAuth();
useEffect(() => {
  if (!isLoading && !user) {
    router.push("/login");
  }
}, [user, isLoading]);
```

### 客户端数据查询（SWR）
```ts
"use client";
import useSWR from "swr";
import apiRoute from "@/lib/services/api-route";

function useItems() {
  const { data, error, isLoading } = useSWR(
    "/items",
    (url) => apiRoute.get(url),
    { revalidateOnFocus: false }
  );
  
  return {
    items: data,
    loading: isLoading,
    error,
  };
}
```

---

## 开发命令

```bash
# 开发服务器
pnpm dev          # 启动 Turbopack 开发服务器

# 构建与部署
pnpm build        # 生产构建
pnpm start        # 启动生产服务器

# 代码质量
pnpm typecheck    # TS 类型检查
pnpm lint         # ESLint 检查
pnpm lint:fix     # 自动修复

# 数据库
pnpm run db:generate    # 生成迁移
pnpm run db:migrate     # 应用迁移
pnpm run db:studio      # 打开可视化编辑器
```

---

## 常见问题排查

| 问题 | 解决方案 |
|------|---------|
| 401 错误频繁 | 检查 cookies 中的 access_token，确认 `handle401` 参数设置 |
| 类型错误 | 使用 `z.infer` 导出类型，避免手动声明 |
| 迁移冲突 | 删除自己的 SQL 文件，重新 `pnpm run db:generate` |
| SSR 问题 | 检查是否在服务端组件使用了客户端 Hook |
| 国际化不生效 | 确认消息文件在 `src/messages/{locale}.json` 中存在 |
| 路由保护失效 | 检查 middleware.ts 中的路由配置和排除规则 |

---

## PR 检查清单

提交前必检：
- [ ] 遵循现有栈，无新库引入
- [ ] 使用 `apiRoute` 发请求
- [ ] 新页面有 `_lib/_components` 结构
- [ ] 数据库变更同时提交 Schema + 迁移文件
- [ ] 没有 `any`（或已加注释原因）
- [ ] TypeScript 无错误（`pnpm typecheck`）
- [ ] ESLint 通过（`pnpm lint`）
- [ ] Server Action 包含权限检查和输入验证
- [ ] 使用 Zod schema 验证所有输入

---

最后更新：2025-12-17
