# 🤖 DeepCosmo AI 编码指南

> 本文档专为 AI 代码助手设计，提供快速上下文与约束条件。
> 在实现任何功能前，请完整阅读本节。

---

## 核心约束（黄金法则）

1. **技术栈锁定** - 只用现有栈，不引入新库：
   - 前端：Next.js 15 + React 19 + TypeScript
   - 认证：Supabase + Better Auth
   - 数据库：Drizzle ORM + PostgreSQL
   - 状态：Zustand（如需），SWR（数据获取）
   - HTTP：Axios（通过 `src/lib/services/api-route.ts`）
   - 国际化：next-intl
   - 样式：Tailwind CSS v4 + Shadcn/ui

2. **禁止清单**（违反即拒绝）：
   - ❌ 原生 `fetch` 或其他 HTTP 库（只用 apiRoute）
   - ❌ 直接 `document`/`window`（客户端组件判空后再用）
   - ❌ 服务端组件使用客户端 Hook（useEffect、useAuth 等）
   - ❌ 在组件中使用 `any`（无法避免时加注释说明原因）
   - ❌ 修改认证主流程或新增认证表
   - ❌ 直接在 Supabase 控制台修改数据库结构

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
│   │   └── [locale]/auth/callback
│   └── api/auth/              # 认证路由
├── components/                # 全局可复用组件
│   ├── layout/                # 布局组件（Navbar, Sidebar 等）
│   └── ui/                    # UI 原始组件
├── db/
│   ├── index.ts               # Drizzle 客户端
│   ├── schema/                # 表定义（领域拆分）
│   │   ├── _utils.ts          # 通用字段（timestamps）
│   │   ├── auth.ts
│   │   ├── pixel.ts
│   │   └── social.ts
│   └── utils.ts               # 数据库工具
├── lib/
│   ├── auth.ts / auth-client.ts  # 认证逻辑
│   ├── services/
│   │   └── api-route.ts       # HTTP 客户端（强制使用）
│   ├── hooks/                 # 共享 hooks
│   └── utils.ts               # 通用工具
├── i18n/                      # 国际化配置
├── types/                     # 全局类型定义
├── config/                    # 配置（env.ts, data-table.ts）
├── middleware.ts              # 路由保护 + 国际化
└── messages/                  # 国际化翻译

drizzle/                       # Drizzle 迁移与快照（自动生成，勿手动编辑）
```

### 关键文件说明
- `src/lib/services/api-route.ts` - HTTP 请求统一入口，带错误处理
- `src/lib/auth.ts` - 服务端认证逻辑（与 Supabase 交互）
- `src/lib/auth-client.ts` - 客户端认证 Hook
- `src/db/schema/_utils.ts` - 通用字段（timestamps, deletedAt）
- `drizzle.config.ts` - Drizzle 配置
- `next.config.ts` - Next.js 配置

---

## 认证流程（快速参考）

**登录：**
```
client: useAuth().signIn(provider) 
  → GET /auth/login → Supabase OAuth 
  → redirect /[locale]/auth/callback#access_token=...
```

**回调处理：**
```
client: /[locale]/auth/callback 
  → 解析 hash + query 
  → POST /auth/session（body: token）
  → server: auth.handleCallback() 
  → 写入 cookies 
  → Supabase user → Drizzle users/profiles 表
  → redirect /dashboard
```

**登出：**
```
DELETE /auth/session → 清 cookies → redirect /login
```

**获取当前用户：**
```
GET /auth/session（从 cookies 读取，无需参数）
```

---

## HTTP 请求模式

### ✅ 正确（强制）
```ts
import apiRoute from "@/lib/services/api-route";

// GET
const data = await apiRoute.get<ResponseType>("/path", { handle401: false });

// POST
const result = await apiRoute.post<ResponseType>("/path", { body: {...} });

// 可选参数
{
  showError?: boolean;           // 是否显示错误提示（默认 true）
  handle401?: boolean;           // 是否自动处理 401 跳转登录（默认 true）
  customErrorHandler?: (e) => void; // 自定义错误处理
}
```

### ❌ 错误（禁止）
```ts
fetch("/api/path")              // 禁止原生 fetch
fetch("http://...")             // 禁止直接调 HTTP
axios.get(...)                  // 禁止直接用 axios
```

---

## 页面与数据流模式

### 固定目录结构
```
app/[locale]/my-page/
├── _lib/
│   ├── actions.ts      # Server Actions（写操作）
│   ├── queries.ts      # 数据库/远程查询（读操作）
│   ├── hooks.ts        # 页面私有 hooks（可选，客户端）
│   └── validations.ts  # Zod schema + 导出类型
├── _components/
│   ├── PageClient.tsx  # "use client" 组件
│   └── ...
└── page.tsx            # 服务端组件（组合层）
```

### 数据流（最佳实践）
```ts
// 1. _lib/queries.ts（服务端读操作）
export async function getMe(id: string) {
  const user = await db.query.users.findFirst({ where: eq(users.id, id) });
  return user;
}

// 2. _lib/actions.ts（服务端写操作）
"use server";
export async function updateProfile(id: string, data: ProfileInput) {
  // 验证、权限检查
  await db.update(users).set(data).where(eq(users.id, id));
}

// 3. _lib/hooks.ts（客户端）
"use client";
export function useSummary() {
  const [data, setData] = useState(null);
  useEffect(() => {
    (async () => {
      const res = await apiRoute.get("/summary");
      setData(res);
    })();
  }, []);
  return { data };
}

// 4. _components/Client.tsx（客户端展示）
"use client";
import { useSummary } from "../_lib/hooks";
export function Client({ me }: { me: User }) {
  const { data } = useSummary();
  return <div>{me.name} - {data?.count}</div>;
}

// 5. page.tsx（服务端组合）
import { getMe } from "./_lib/queries";
import Client from "./_components/Client";
export default async function Page() {
  const me = await getMe(sessionUserId);
  return <Client me={me} />;
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
- 主键：简单主键为主（`id: text("id").primaryKey()`）
- 软删除：使用 `deletedAt: timestamp("deleted_at")`

### 示例（src/db/schema/pixel.ts）
```ts
import { pgTable, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { timestamps } from "./_utils";

export const pixelArts = pgTable("pixel_arts", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  isFeatured: boolean("is_featured").default(false),
  ...timestamps,
});
```

---

## Do & Don't（快速决策）

### ✅ 应该做
- 使用 `apiRoute.get/post()` 发请求
- 在客户端组件中判空后再用浏览器 API
- 受保护页面通过 middleware 检查
- 新页面遵循 `_lib/_components` 结构
- Schema 变更包含迁移文件一起提交
- 在 TypeScript 中充分利用类型（避免 any）

### ❌ 不应该做
- 用原生 `fetch` 或 `axios`
- 在服务端组件直接使用 `useEffect/useState/useAuth`
- 直接在 Supabase 控制台修改表结构
- 创建多余的数据库表（讨论业务必要性）
- 改动认证主流程
- 使用 `any`（无法避免时加注释）

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
});

export type User = z.infer<typeof userSchema>;
```

### 验证与转换
```ts
// actions.ts
"use server";
import { userSchema } from "./validations";

export async function updateUser(input: unknown) {
  const parsed = userSchema.parse(input); // 失败抛异常
  // 或使用 safeParse 捕获错误
  const result = userSchema.safeParse(input);
  if (!result.success) return { error: result.error.flatten() };
  // ...
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

## 常见代码片段

```ts
// 获取当前会话
const session = await apiRoute.get("/auth/session", { handle401: false });
if (!session?.user) redirect("/login");

// Server Action 示例
"use server";
export async function createItem(formData: FormData) {
  const data = Object.fromEntries(formData);
  const parsed = itemSchema.safeParse(data);
  if (!parsed.success) return { error: parsed.error.flatten() };
  
  await db.insert(items).values(parsed.data);
  revalidatePath("/items");
}

// 数据表查询（with 关系）
const user = await db.query.users.findFirst({
  where: eq(users.id, id),
  with: { profiles: true },
});

// 客户端查询（SWR）
import useSWR from "swr";
function useItems() {
  const { data, error } = useSWR("/items", (url) => apiRoute.get(url));
  return { items: data, loading: !error && !data, error };
}
```

---

## 调试与开发

### 开发命令
```bash
pnpm dev          # 启动开发服务器
pnpm build        # 生产构建
pnpm typecheck    # TS 类型检查
pnpm lint         # ESLint 检查
pnpm lint:fix     # 自动修复
```

### 常见问题排查
- 401  错误？检查 cookies 和 `handle401` 参数
- 类型错误？确保使用 `z.infer` 导出类型，避免手写
- 迁移冲突？删除自己的 SQL，重新 `db:generate`
- SSR 问题？检查是否在服务端组件用了客户端 Hook

---

## PR 检查清单

提交前必检：
- [ ] 遵循现有栈，无新库引入
- [ ] 使用 `apiRoute` 发请求
- [ ] 新页面有 `_lib/_components` 结构
- [ ] 数据库变更同时提交 Schema + 迁移文件
- [ ] 没有 `any`（或已加注释）
- [ ] TypeScript 无错误（`pnpm typecheck`）
- [ ] ESLint 通过（`pnpm lint`）

---

最后更新：2025-12-15
