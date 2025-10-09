"use client";

import { useAuthGuard } from "@/lib/auth/hooks";

export default function DashboardPage() {
  const { user, loading } = useAuthGuard();

  if (loading) {
    return (
      <div className="flex min-h-[calc(100svh-3.5rem)] items-center justify-center">
        <div className="flex items-center space-x-2">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <span>加载中...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">仪表板</h1>
          <p className="text-muted-foreground">欢迎回来，{user?.name || user?.email}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="p-6 border rounded-lg">
          <h3 className="text-lg font-semibold mb-2">用户信息</h3>
          <div className="space-y-2 text-sm">
            <p><strong>ID:</strong> {user?.id}</p>
            <p><strong>邮箱:</strong> {user?.email}</p>
            <p><strong>姓名:</strong> {user?.name || "未设置"}</p>
            <p><strong>角色:</strong> {user?.role}</p>
          </div>
        </div>

        <div className="p-6 border rounded-lg">
          <h3 className="text-lg font-semibold mb-2">快速操作</h3>
          <div className="space-y-2">
            <button className="w-full text-left p-2 hover:bg-muted rounded">
              📊 查看统计
            </button>
            <button className="w-full text-left p-2 hover:bg-muted rounded">
              ⚙️ 设置
            </button>
            <button className="w-full text-left p-2 hover:bg-muted rounded">
              📝 创建内容
            </button>
          </div>
        </div>

        <div className="p-6 border rounded-lg">
          <h3 className="text-lg font-semibold mb-2">系统状态</h3>
          <div className="space-y-2 text-sm">
            <div className="flex items-center space-x-2">
              <div className="h-2 w-2 bg-green-500 rounded-full"></div>
              <span>认证系统正常</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="h-2 w-2 bg-green-500 rounded-full"></div>
              <span>数据库连接正常</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="h-2 w-2 bg-green-500 rounded-full"></div>
              <span>Supabase连接正常</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}