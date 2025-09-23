import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function PUT(request: Request) {
  const token = (await cookies()).get("access_token")?.value;
  if (!token) {
    return NextResponse.json({ code: 401, data: null, msg: "unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  
  // 模拟更新用户资料
  const updatedUser = {
    id: 1,
    name: body.name || "Deep User",
    email: body.email || "user@example.com",
    role: "member" as const,
    avatar: body.avatar,
    updatedAt: new Date().toISOString(),
  };

  return NextResponse.json({
    code: 200,
    data: updatedUser,
    msg: "更新成功",
  });
}
