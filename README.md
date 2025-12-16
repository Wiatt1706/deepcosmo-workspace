# DeepCosmo

> **轻量、现代、可复用的小团队前端模板**

基于 Next.js 15 构建的现代化全栈应用模板，集成了企业级应用开发所需的各种最佳实践和核心功能。

## ✨ 特性

### 🏗️ 核心功能
- **🔐 完整的认证系统** - 登录、登出、Token 刷新
- **🌍 国际化支持** - 中文、英文、日文、韩文
- **🎨 主题切换** - 明暗主题无缝切换
- **📱 响应式设计** - 完美适配各种设备
- **🛡️ 类型安全** - 全面的 TypeScript 支持
- **🔄 状态管理** - SWR 数据获取和缓存

### 🛠️ 技术栈

#### 前端框架
- **Next.js 15** - React 全栈框架，支持 App Router
- **React 19** - 最新版本的 React
- **TypeScript** - 静态类型检查
- **Tailwind CSS v4** - 原子化 CSS 框架

#### UI 组件
- **Shadcn/ui** - 高质量的组件库
- **Radix UI** - 无障碍的原始组件
- **Lucide React** - 精美的图标库
- **Sonner** - 优雅的通知组件

#### 状态管理与数据获取
- **SWR** - 数据获取和缓存
- **Nuqs** - URL 状态管理
- **Axios** - HTTP 客户端
- **Nookies** - Cookie 管理

#### 国际化与主题
- **next-intl** - 国际化解决方案
- **next-themes** - 主题管理

#### 开发工具
- **ESLint 9** - 代码检查
- **Husky** - Git hooks
- **Commitlint** - 提交信息规范
- **Lint-staged** - 暂存文件检查

## 🚀 快速开始

### 环境要求
- Node.js 18.0 或更高版本
- pnpm、npm 或 yarn

### 安装与运行

```bash
# 克隆项目
git clone <your-repo-url>
cd deepcosmo-workspace

# 安装依赖
pnpm install
# 或
npm install

# 启动开发服务器
pnpm dev
# 或
npm run dev
```

访问 [http://localhost:3000](http://localhost:3000) 查看应用。

### 构建与部署

```bash
# 构建生产版本
pnpm build

# 启动生产服务器
pnpm start

# 类型检查
pnpm typecheck

# 代码检查和修复
pnpm lint
pnpm lint:fix
```

## ⚙️ 配置

### 环境变量

创建 `.env.local` 文件并配置以下变量：

```env
# API 配置
NEXT_PUBLIC_API_BASE_URL=http://localhost:8798
NEXT_PUBLIC_API_USER=http://localhost:3000
NEXT_PUBLIC_API_ROUTE_URL=/api
NEXT_PUBLIC_AUTH_SERVICE_URL=
NEXT_PUBLIC_API_KEY=your-api-key

# WebSocket 配置
WS_URL=wss://ws.example.com/ws

# 其他配置
PORT=3000
VERCEL_PROJECT_PRODUCTION_URL=
```

### 支持的语言

项目支持以下语言，默认为中文：
- `zh` - 中文（默认）
- `en` - 英文
- `ja` - 日文
- `ko` - 韩文

## 📁 项目结构

```
├── drizzle/                    # Drizzle 迁移与快照（自动生成）
├── messages/                   # 国际化翻译文件
│   ├── en.json
│   ├── ja.json
│   ├── ko.json
│   └── zh.json
├── public/                     # 静态资源
├── src/
│   ├── app/                   # Next.js App Router
│   │   ├── [locale]/          # 国际化路由
│   │   │   ├── (main)/        # 主区域
│   │   │   ├── (auth)/        # 认证区域
│   │   │   ├── error.tsx
│   │   │   ├── layout.tsx
│   │   │   └── page.tsx
│   │   ├── api/auth/          # 认证 API
│   │   │   ├── login/
│   │   │   └── session/
│   │   └── globals.css
│   ├── components/            # 全局可复用组件
│   │   ├── layout/            # 布局组件（Navbar, Sidebar）
│   │   ├── ui/                # UI 原始组件
│   │   └── auth/              # 认证相关
│   ├── config/                # 配置文件
│   ├── db/                    # 数据库层
│   │   ├── index.ts           # Drizzle 客户端
│   │   └── schema/            # 表定义
│   ├── hooks/                 # 共享 hooks
│   ├── i18n/                  # 国际化配置
│   ├── lib/
│   │   ├── auth.ts            # 服务端认证
│   │   ├── auth-client.ts     # 客户端认证
│   │   ├── services/
│   │   │   └── api-route.ts   # HTTP 客户端（强制使用）
│   │   └── utils.ts
│   ├── types/                 # TypeScript 类型定义
│   ├── middleware.ts          # 路由保护 + 国际化
│   └── messages/              # 国际化翻译
├── .github/
│   └── copilot-instructions.md  # AI 编码指南
├── components.json            # Shadcn/ui 配置
├── drizzle.config.ts          # Drizzle 配置
├── next.config.ts             # Next.js 配置
├── package.json
├── PROJECT_RULES.md           # 项目规范（开发参考）
├── tsconfig.json
└── README.md
```

## 🔐 认证系统

### API 端点
- `POST /api/auth/login` - 用户登录
- `POST /api/auth/refresh` - 刷新 Token
- `POST /api/auth/logout` - 用户登出
- `GET /api/common/me` - 获取用户信息
- `PUT /api/common/profile` - 更新用户资料
- `GET /api/common/dashboard` - 获取仪表板数据

### 用户角色
- `admin` - 管理员
- `member` - 成员
- `guest` - 访客

## 🎨 UI 组件

项目使用 Shadcn/ui 组件库，已配置的组件包括：
- Button - 按钮组件
- Sonner - 通知组件

添加新组件：
```bash
npx shadcn@latest add [component-name]
```

## 🌍 国际化

### 添加新语言
1. 在 `messages/` 目录下创建新的语言文件
2. 在 `src/i18n/routing.ts` 中添加新语言到 `locales` 数组
3. 重启开发服务器

### 使用翻译
```tsx
import { useTranslations } from 'next-intl';

function MyComponent() {
  const t = useTranslations('Login');
  return <h1>{t('title')}</h1>;
}
```

## 🔧 开发指南

### 项目规范

本项目遵循严格的开发规范以确保代码质量和一致性。请阅读以下文档：

- **[.github/copilot-instructions.md](.github/copilot-instructions.md)** - AI 编码助手指南（黄金法则、架构、最佳实践）
- **[PROJECT_RULES.md](PROJECT_RULES.md)** - 项目规范速查版（面向人类与 AI）

### 数据库开发

参考 [数据库 SOP 文档](docs/DATABASE.md) 了解：
- 数据库结构修改流程
- Drizzle 迁移管理
- 命名规范与最佳实践
- 团队协作与冲突解决

快速命令：
```bash
pnpm run db:generate    # 生成迁移
pnpm run db:migrate     # 应用迁移
pnpm run db:push        # 强制同步（仅本地原型）
pnpm run db:studio      # 打开可视化管理界面
```

### 代码质量

```bash
# 类型检查
pnpm typecheck

# 代码检查
pnpm lint

# 自动修复
pnpm lint:fix
```

### 页面与组件开发

新增页面遵循以下结构：

```
app/[locale]/<page-name>/
├── _lib/
│   ├── actions.ts       # Server Actions（写操作）
│   ├── queries.ts       # 数据库查询（读操作）
│   ├── validations.ts   # Zod Schema 与类型
│   └── hooks.ts         # 页面私有 hooks（可选）
├── _components/
│   ├── PageClient.tsx   # 客户端组件
│   └── ...
└── page.tsx             # 服务端组件（组合层）
```

**数据流示例：**

```tsx
// _lib/queries.ts (服务端)
export async function getUserProfile(id: string) {
  return db.query.users.findFirst({ 
    where: eq(users.id, id),
    with: { profiles: true }
  });
}

// _components/ProfileCard.tsx (客户端)
"use client";
export function ProfileCard({ user }: { user: any }) {
  return <div>{user.name}</div>;
}

// page.tsx (服务端组合)
import { getUserProfile } from "./_lib/queries";
import ProfileCard from "./_components/ProfileCard";

export default async function Page() {
  const user = await getUserProfile(userId);
  return <ProfileCard user={user} />;
}
```

### HTTP 请求

**强制使用 `apiRoute`，禁止原生 fetch：**

```ts
import apiRoute from "@/lib/services/api-route";

// GET
const data = await apiRoute.get<ResponseType>("/path", { 
  handle401: false // 可选：禁止自动 401 处理
});

// POST
const result = await apiRoute.post<ResponseType>("/path", { 
  body: { /* 数据 */ }
});
```

### 类型安全

使用 Zod 作为数据验证与类型的唯一真源：

```ts
// _lib/validations.ts
import { z } from "zod";

export const userSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  email: z.string().email(),
});

export type User = z.infer<typeof userSchema>;

// 使用
const parsed = userSchema.parse(input);
```

### 国际化

支持的语言：中文(zh)、英文(en)、日文(ja)、韩文(ko)

```tsx
// 服务端
import { getTranslations } from "next-intl/server";

export default async function Page() {
  const t = await getTranslations("PageName");
  return <h1>{t("title")}</h1>;
}

// 客户端
"use client";
import { useTranslations } from "next-intl";

export function Component() {
  const t = useTranslations("PageName");
  return <h1>{t("title")}</h1>;
}
```

### 常见约束

**✅ 应该做：**
- 使用 `apiRoute.get/post()` 发送请求
- 受保护页面通过 `middleware.ts` 鉴权
- 新页面遵循 `_lib/_components` 结构
- Schema 变更包含迁移文件一起提交

**❌ 不应该做：**
- 用原生 `fetch` 或直接 `axios`
- 在服务端组件使用客户端 Hook（`useEffect`、`useState` 等）
- 直接在 Supabase 控制台修改表结构
- 使用 `any` 类型（无法避免时必须加注释）

### Git 工作流

提交规范遵循 Conventional Commits：

```bash
# 提交前检查
pnpm lint:fix       # 自动修复
pnpm typecheck      # 类型检查

# 数据库变更提交
git add src/db/schema drizzle/
git commit -m "feat(db): add is_featured to pixel_arts"

# 功能提交
git commit -m "feat(page): add user profile page"
git commit -m "fix(auth): handle 401 properly"
```

---

### PR 检查清单

提交前请检查：
- [ ] 遵循现有技术栈，无新库引入
- [ ] 使用 `apiRoute` 发送 HTTP 请求
- [ ] 新页面遵循 `_lib/_components` 目录结构
- [ ] 数据库变更同时提交 Schema 与迁移文件
- [ ] 无 `any` 类型或已加注释说明原因
- [ ] 通过 TypeScript 检查（`pnpm typecheck`）
- [ ] 通过 ESLint 检查（`pnpm lint`）
- [ ] 提交信息遵循 Conventional Commits 规范

## 📦 部署

### Vercel 部署
1. 将代码推送到 GitHub
2. 在 Vercel 导入项目
3. 配置环境变量
4. 部署

### Docker 部署
```dockerfile
FROM node:18-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:18-alpine AS runner
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

### 开发流程
1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

---

## � 相关资源

- **AI 编码指南**：[.github/copilot-instructions.md](.github/copilot-instructions.md)
- **项目规范**：[PROJECT_RULES.md](PROJECT_RULES.md)
- **数据库 SOP**：[docs/DATABASE.md](docs/DATABASE.md)
- [Next.js 文档](https://nextjs.org/docs)
- [Tailwind CSS 文档](https://tailwindcss.com/docs)
- [Shadcn/ui 文档](https://ui.shadcn.com)
- [next-intl 文档](https://next-intl-docs.vercel.app)
- [Drizzle ORM 文档](https://orm.drizzle.team)
