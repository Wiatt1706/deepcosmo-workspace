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
├── messages/           # 国际化翻译文件
│   ├── en.json
│   ├── ja.json
│   ├── ko.json
│   └── zh.json
├── src/
│   ├── app/           # Next.js App Router
│   │   ├── [locale]/  # 国际化路由
│   │   ├── api/       # API 路由
│   │   └── globals.css
│   ├── components/    # 可复用组件
│   │   ├── layout/    # 布局组件
│   │   └── ui/        # UI 组件
│   ├── config/        # 配置文件
│   ├── i18n/          # 国际化配置
│   ├── lib/           # 工具库
│   │   └── services/  # API 服务
│   ├── types/         # TypeScript 类型定义
│   └── middleware.ts  # 中间件
├── components.json    # Shadcn/ui 配置
├── next.config.ts     # Next.js 配置
├── package.json
├── tailwind.config.js
└── tsconfig.json
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

### 代码规范
- 使用 ESLint 进行代码检查
- 使用 Prettier 格式化代码
- 提交信息遵循 Conventional Commits 规范

### Git Hooks
- **pre-commit**: 检查暂存文件的代码质量
- **commit-msg**: 验证提交信息格式

### 推荐的 VSCode 扩展
- ESLint
- Prettier
- Tailwind CSS IntelliSense
- TypeScript Importer

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

## 🔗 相关链接

- [Next.js 文档](https://nextjs.org/docs)
- [Tailwind CSS 文档](https://tailwindcss.com/docs)
- [Shadcn/ui 文档](https://ui.shadcn.com)
- [next-intl 文档](https://next-intl-docs.vercel.app)
