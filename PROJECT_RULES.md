# DeepCosmo 项目规范（高信噪速查版）

本文件面向人类与AI助手，优先提供“能直接指导实现的最短路径”。如有分歧，以此为准。

## 0) 黄金法则（AI请先读完这一节）
- 仅用现有栈：Next.js + next-intl + Supabase + Drizzle + Zod + Zustand + nuqs + Axios。
- 所有 HTTP 请求统一走 `src/lib/services/api-route.ts`（路径不带 `/api` 前缀）。
- 禁止原生 `fetch`、禁止直接用 `document/window`（仅限客户端组件且需判空）。
- 页面目录必须使用 `_lib` 与 `_components`；逻辑进 `_lib`，UI 进 `_components`。
- SSR 优先；客户端组件显式 `"use client"`；服务端组件禁止使用客户端 Hook。
- 新增/修改代码须同步更新本文档，保持规范为“唯一真源”。

## 1) 关键目录与文件
```
src/
├─ app/[locale]/<page>/
│  ├─ _lib/            # actions.ts / queries.ts / validations.ts
│  ├─ _components/     # 页面私有组件
│  └─ page.tsx         # 页面入口
├─ app/api/auth/
│  ├─ login/           # GET /auth/login
│  └─ session/         # GET/POST/DELETE /auth/session
├─ components/         # 通用组件（Navbar, LocaleSwitcher 等）
├─ lib/auth/           # 认证服务与 hooks
├─ lib/services/       # api-route.ts（HTTP 客户端）
├─ i18n/               # next-intl 路由与导航封装
└─ middleware.ts       # 路由保护 + 国际化
```

## 2) 认证与会话（最少心智负担）
- 登录：`useAuth().signIn(provider, locale)` → API `GET /auth/login` → Supabase → 回到 `/{locale}/auth/callback#access_token=...`。
- 回调：客户端 `auth/callback` 解析 hash+query → `POST /auth/session` → 服务端 `auth.handleCallback()` → 设置 cookies → 跳转 `/dashboard`。
- 退出：`DELETE /auth/session` → 清 Cookie。
- 同步：`auth.handleCallback()` 自动将 Supabase 用户写入 Drizzle（`users`/`profiles`）。

## 3) HTTP 请求（强约束）
- 统一使用：
```ts
import apiRoute from "@/lib/services/api-route";
await apiRoute.get("/auth/session");
await apiRoute.post("/auth/session", body);
```
- 可选项：`{ showError?: boolean; handle401?: boolean; customErrorHandler?: (e) => void }`。
- 不要带 `/api` 前缀；`baseURL` 在 `config/env.ts` 配置（当前为空字符串）。

## 4) 国际化（无缝体验）
- 使用 next-intl 的 `[locale]` 路由与 `routing`/`navigation` 封装。
- 语言选择：`LocaleSwitcher` 写入 `NEXT_LOCALE`；`middleware.ts` 根路径优先读该 cookie，没有则回退默认 `zh`。
- 切换语言：`router.push({ pathname }, { locale })` 后轻刷新 `router.refresh()`。

## 5) 页面结构（固定模板）
- `_lib/actions.ts`：写操作（Server Actions）。
- `_lib/queries.ts`：读操作（DB/远程）。
- `_lib/validations.ts`：Zod Schema 与导出的 Type。

### 5.1) 数据与页面分离（Hook 优先）
- 规则：
  - 页面只做组合与展示；数据放 `queries.ts`（Server）/ Hook（Client）。
  - 共享 Hook → `src/lib/hooks/`；页面私有 Hook → `app/[locale]/<page>/_lib/hooks.ts`。
  - 服务端优先；需客户端动态数据时再用 `api-route.ts` + Hook。

极简示例：
```ts
// _lib/queries.ts (Server)
export async function getMe(id: string) { /* 调 Drizzle 返回用户 */ }

// _lib/hooks.ts (Client)
"use client";
export function useSummary() { /* 调 apiRoute.get()/post() 封装状态 */ }

// page.tsx (Server 组合)
import { getMe } from "./_lib/queries";
import Client from "./_components/Client";
export default async function Page() {
  const me = await getMe("session-user-id");
  return <Client me={me} />;
}

// _components/Client.tsx (Client 展示)
"use client";
import { useSummary } from "../_lib/hooks";
export default function Client({ me }: { me: any }) {
  const { data } = useSummary();
  return <div>{me?.name} - {data?.count ?? 0}</div>;
}
```

## 6) 数据与类型（最小集合）
- 数据库仅保留必要表：`users`, `profiles`。
- Zod 作为单一真源，类型用 `z.infer` 导出。

## 7) Do & Don’t（立刻可判断）
- ✅ 用 `api-route.ts`，不要 `fetch`。
- ✅ 客户端组件判空再用浏览器 API。
- ✅ 受保护页面交给 `middleware.ts` 做鉴权。
- ✅ 新页面遵循 `_lib/_components` 结构。
- ❌ 新建多余表或改动认证主流程。
- ❌ 在服务端组件里用客户端 Hook。
- ❌ 使用 `any`（无法避免时局部抑制并写明原因）。

## 8) 常用片段（可直接粘贴）
```ts
// 认证 Hook（客户端）
const { user, loading, signIn, signOut, refetch } = useAuth();

// 发请求（抑制 401 自动处理场景）
const me = await apiRoute.get<{ user?: User }>("/auth/session", { handle401: false });

// Zod Schema
const schema = z.object({ id: z.string().uuid(), name: z.string().min(1) });
type Model = z.infer<typeof schema>;
```

## 9) 版本与环境
- 以仓库的 Node/pnpm/锁文件为准。
- 环境变量（示例）：
```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
DATABASE_URL=...
NEXT_PUBLIC_FRONTEND_URL=http://localhost:3000
NEXT_PUBLIC_API_ROUTE_URL=""
```

— 本文档为唯一规范源；提交前请自检是否满足以上要点。
