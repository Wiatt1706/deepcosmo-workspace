"use client";

import { ThemeToggle } from "@/components/layout/theme-toggle";
import { UserMenu } from "@/components/auth/user-menu";
import { Link } from "@/i18n/navigation";
import LocaleSwitcher from "./locale-switcher";

export function Navbar() {
  // 注意：我们移除了这里的 isAuthenticated 状态检查逻辑
  // 逻辑被下放到 UserMenu 内部处理，使 Navbar 保持纯粹的布局功能

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        {/* 左侧 Logo */}
        <Link href="/" className="flex items-center space-x-2 font-semibold">
          <span className="text-xl tracking-tight">DeepCosmo</span>
        </Link>

        {/* 右侧工具栏 */}
        <div className="flex items-center gap-3">
          <nav className="flex items-center gap-1">
            <LocaleSwitcher />
            <ThemeToggle />
          </nav>
          
          {/* 分隔线 */}
          <div className="h-4 w-[1px] bg-border mx-1 hidden sm:block" />

          {/* 直接放置 UserMenu。
             内部会自动根据 useSession() 的状态渲染：
             - 加载中：骨架屏
             - 未登录：登录按钮
             - 已登录：用户头像菜单
          */}
          <UserMenu />
        </div>
      </div>
    </header>
  );
}