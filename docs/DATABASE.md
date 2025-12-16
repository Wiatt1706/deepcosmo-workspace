# 🗄️ DeepCosmo — 数据库开发规范与 SOP

> **核心原则**：代码即真理（Code as Source of Truth）。
>
> 所有数据库结构变更必须通过 Drizzle Schema 管理，禁止直接在 Supabase 或数据库控制台手动修改表结构。

---

## 目录

- [概览](#概览)
- [快速命令](#快速命令)
- [目录结构与约定](#目录结构与约定)
- [修改 Schema 的标准流程（SOP）](#修改-schema-的标准流程sop)
- [迁移冲突与解决](#迁移冲突与解决)
- [命名规则与最佳实践](#命名规则与最佳实践)
- [灾难预防与恢复建议](#灾难预防与恢复建议)

---

## 概览

本项目使用 **Drizzle ORM**（`drizzle-orm` + `drizzle-kit`）管理数据库 schema 与迁移。

- Schema 的 TypeScript 定义：`src/db/schema/`
- 迁移和快照：`drizzle/` 目录（由 Drizzle 自动生成）
- 数据库：PostgreSQL（托管于 Supabase）

**关键原则：请以 TypeScript 代码为唯一可信来源，所有变更必须通过迁移记录。**

---

## 快速命令

确认于 `package.json`：

### 生成迁移 SQL（本地分析，不连接数据库）
```bash
pnpm run db:generate
# 或：npm run db:generate
```

### 应用迁移到当前数据库
```bash
pnpm run db:migrate
```

### 强制同步（跳过迁移机制，谨慎！）
```bash
pnpm run db:push
# ⚠️ 仅限非常早期的本地原型，生产环境禁用
```

### 打开 Drizzle Studio（可视化查看/编辑测试数据）
```bash
pnpm run db:studio
```

> 注：上述脚本配置在 `package.json` 中，由 `drizzle.config.ts` 管理。

---

## 目录结构与约定

### 推荐的项目结构

```
src/db/
├── index.ts           # 数据库连接/客户端实例（Drizzle 客户端）
├── schema/            # TypeScript 的表/关系定义（按业务域拆分）
│   ├── _utils.ts      # 通用字段定义（timestamps 等）
│   ├── auth.ts        # 认证域（users, sessions, accounts）
│   ├── pixel.ts       # 核心业务域（pixel_arts, collections 等）
│   └── social.ts      # 社交域（comments, likes, follows 等）
├── utils.ts           # 数据库工具函数
└── (其他运行时文件)

drizzle/               # Drizzle 自动生成（不要手动编辑）
├── meta/
│   ├── _journal.json
│   └── *.json         # 快照
└── *.sql              # 迁移文件
```

### 约定要点

- **表名**：复数、snake_case（例如 `pixel_arts`, `users`, `comments`）
- **列名**：snake_case（例如 `created_at`, `is_featured`, `user_id`）
- **TypeScript 字段名**：camelCase（例如 `createdAt`, `isFeatured`, `userId`）
  - 在 Schema 中声明时映射为对应的 snake_case 列名
- **关系定义**：在 Schema 中显式定义 `relations`，以便使用 `db.query.xxx.findMany({ with: {...} })` 等便捷查询

---

## 修改 Schema 的标准流程（SOP）

### 步骤 1：修改 TypeScript Schema

进入 `src/db/schema/` 目录，找到对应的业务域文件进行修改。

**推荐做法：**
- 重用 `src/db/schema/_utils.ts` 里的 `timestamps` 等通用字段
- 表名为复数、snake_case
- 字段在 TypeScript 中用 camelCase，在数据库中映射为 snake_case

**示例（`src/db/schema/pixel.ts`）：**

```ts
import { pgTable, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { timestamps } from "./_utils";

export const pixelArts = pgTable("pixel_arts", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  isFeatured: boolean("is_featured").default(false),
  creatorId: text("creator_id").notNull().references(() => users.id),
  ...timestamps,
});
```

### 步骤 2：生成迁移 SQL（本地执行并检查）

```bash
pnpm run db:generate
```

**检查点：**
- 确保在 `drizzle/` 目录下生成了预期的 `.sql` 文件（例如 `0003_add_is_featured.sql`）
- 打开新的 SQL 文件，确认语句符合预期
- **重要**：检查是否有非预期的 `DROP TABLE`、`DROP COLUMN` 等破坏性操作

### 步骤 3：在本地环境应用迁移

```bash
pnpm run db:migrate
```

然后启动开发服务器并运行基本功能测试，确保没有问题：

```bash
pnpm dev
```

**注意：**
- 只有在非常早期的本地原型阶段才可使用 `pnpm run db:push`（会跳过迁移机制）
- 生产环境禁止使用 `push`

### 步骤 4：提交变更

Schema 代码 与 生成的迁移文件都应一并提交到 Git：

```bash
git add src/db/schema drizzle/
git commit -m "feat(db): add is_featured to pixel_arts table"
```

**提交信息规范：**
- `feat(db):` - 新增表或字段
- `fix(db):` - 修复数据结构问题
- `refactor(db):` - 表结构重构

---

## 迁移冲突与解决

### 场景

多个开发者同时修改 schema，生成了两个同号迁移：
- 开发者 A 生成了：`0002_add_tags.sql`
- 开发者 B 生成了：`0002_add_profile.sql`

### 推荐解法

**第 1 步：**  
在合并分支时，**保留合并后的 `src/db/schema/`**（手动解决 TypeScript 冲突）。

**第 2 步：**  
删除本地冲突的 migration SQL 文件（你自己生成的那份，例如删除 `0002_add_profile.sql`）。

**第 3 步：**  
基于合并后的最新 Schema，重新运行：
```bash
pnpm run db:generate
```

Drizzle 会生成一个新的、包含两人变更的迁移（例如 `0003_merged_changes.sql`）。

**第 4 步：**  
应用新的迁移：
```bash
pnpm run db:migrate
```

**第 5 步：**  
提交合并后的 Schema + 新生成的迁移：
```bash
git add src/db/schema drizzle/
git commit -m "merge: resolve db schema conflicts"
```

---

## 命名规则与最佳实践

### 字段命名约定

| 场景 | 数据库列名 | TypeScript 字段名 | 说明 |
|------|----------|-----------------|------|
| 用户 ID | `user_id` | `userId` | 外键：使用 `_id` 后缀 |
| 创建时间 | `created_at` | `createdAt` | 使用 `...timestamps` |
| 更新时间 | `updated_at` | `updatedAt` | 使用 `...timestamps` |
| 软删除 | `deleted_at` | `deletedAt` | 可选，避免物理删除 |
| 是否启用 | `is_featured` | `isFeatured` | 布尔字段使用 `is_` 前缀 |

### 正确示例

```ts
// ✅ 正确（优雅）
export const users = pgTable("users", {
  id: text("id").primaryKey(),
  firstName: text("first_name"),
  role: text("role").$type<"admin" | "user">(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
```

### 错误示例

```ts
// ❌ 错误（混乱）
export const UserTable = pgTable("User", {        // PascalCase 表名
  ID: text("ID"),                                 // 大写列名
  user_email: text("user_email"),                 // 冗余前缀
  FirstName: text("FirstName"),                   // 混合大小写
});
```

### 软删除（Soft Delete）

对于核心业务数据（如作品、用户），尽量不物理删除，使用 `deletedAt` 标记。

**`src/db/schema/_utils.ts` 示例：**

```ts
import { timestamp } from "drizzle-orm/pg-core";

export const timestamps = {
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  deletedAt: timestamp("deleted_at"),
};
```

**在 Schema 中使用：**

```ts
export const pixelArts = pgTable("pixel_arts", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  ...timestamps,
  // 删除时只需执行：UPDATE pixel_arts SET deleted_at = NOW() WHERE id = '...'
});
```

---

## 灾难预防与恢复建议

### ⛔ 禁止漂移（No Drift）

**不要直接在 Supabase 或数据库管理控制台手动修改 schema。**

如果非可避免地做了手动变更：

1. 使用 Drizzle 反向生成本地 Schema：
   ```bash
   drizzle-kit introspect --config=drizzle.config.ts
   ```
2. 检查生成的 Schema 代码
3. 运行 `pnpm run db:generate` 生成迁移以记录变更
4. 提交 Schema + 迁移

### 📦 数据备份

在执行重大迁移前（如删除列、重命名表），**建议手动备份一次**：

1. 登录 Supabase 控制台
2. 进入项目的 Backups 页面，点击 "Create a backup"
3. 等待备份完成
4. 执行迁移

（Supabase 会自动备份，但手动备份额外的安全保障）

### 常见问题排查

| 问题 | 原因 | 解决方案 |
|------|------|--------|
| 迁移冲突 | 多人同时修改 schema | 按照 [迁移冲突与解决](#迁移冲突与解决) 操作 |
| Schema 与数据库不同步 | 手动修改或迁移未应用 | `pnpm run db:migrate` 或 `drizzle-kit introspect` |
| 无法回滚 | Drizzle 不支持自动回滚 | 手动从备份恢复或编写回滚迁移 |

---

## Pull Request 检查清单

提交数据库相关变更前：

- [ ] 修改 `src/db/schema` 的同时提交了 `drizzle/` 中对应的迁移文件
- [ ] 运行过 `pnpm run db:generate` 并检查生成 SQL 正确，无破坏性操作
- [ ] 在本地使用 `pnpm run db:migrate` 验证变更无误并通过基本联调
- [ ] 提交信息遵循 Conventional Commits 规范（`feat(db):`, `fix(db):` 等）
- [ ] 如有破坏性变更，PR 中说明业务原因并明确备份计划

---

## 常用片段

### 创建新表

```ts
// src/db/schema/pixel.ts
import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { timestamps } from "./_utils";

export const pixelArts = pgTable("pixel_arts", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  ...timestamps,
});
```

### 添加关系

```ts
import { relations } from "drizzle-orm";

export const pixelArtsRelations = relations(pixelArts, ({ one, many }) => ({
  creator: one(users, {
    fields: [pixelArts.creatorId],
    references: [users.id],
  }),
  comments: many(comments),
}));
```

### 查询（带关系）

```ts
const artWithComments = await db.query.pixelArts.findFirst({
  where: eq(pixelArts.id, artId),
  with: { 
    creator: true,
    comments: true,
  },
});
```

---

文档维护人：Tech Lead  
最后更新：2025-12-15
