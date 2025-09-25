import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

const ProfileSchema = z.object({
  name: z.string().min(1, "姓名不能为空").max(255).optional(),
  email: z.string().email("邮箱格式不正确").optional(),
  avatar: z.string().url("头像必须是有效的URL").optional(),
});

export async function PUT(request: Request) {
  const token = (await cookies()).get("access_token")?.value;
  if (!token) {
    return NextResponse.json({ code: 401, data: null, msg: "unauthorized" }, { status: 401 });
  }

  const json = await request.json().catch(() => ({}));
  const parse = ProfileSchema.safeParse(json);
  if (!parse.success) {
    const message = parse.error.issues.map(i => i.message).join("; ");
    return NextResponse.json({ code: 400, data: null, msg: message }, { status: 400 });
  }
  const body = parse.data;
  
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
