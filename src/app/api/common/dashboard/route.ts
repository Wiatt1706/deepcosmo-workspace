import { NextResponse } from "next/server";

export async function GET() {
  // 模拟仪表板数据
  const dashboardData = {
    stats: {
      totalUsers: 1234,
      activeUsers: 856,
      newUsers: 23,
    },
    recentActivities: [
      {
        id: 1,
        type: "user_login",
        description: "用户登录",
        timestamp: new Date().toISOString(),
      },
      {
        id: 2,
        type: "data_update",
        description: "数据更新",
        timestamp: new Date(Date.now() - 3600000).toISOString(),
      },
      {
        id: 3,
        type: "system_backup",
        description: "系统备份",
        timestamp: new Date(Date.now() - 7200000).toISOString(),
      },
    ],
  };

  return NextResponse.json({
    code: 200,
    data: dashboardData,
    msg: "ok",
  });
}
