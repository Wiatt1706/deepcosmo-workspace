import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

const LoginSchema = z.object({
  email: z.string().email("邮箱格式不正确"),
  password: z.string().min(6, "密码长度至少为6位"),
});

export async function POST(request: Request) {
  const json = await request.json().catch(() => ({}));

  const parse = LoginSchema.safeParse(json);
  if (!parse.success) {
    const message = parse.error.issues.map(i => i.message).join("; ");
    return NextResponse.json({ code: 400, data: null, msg: message }, { status: 400 });
  }

  const { email } = parse.data;

  // 优先尝试从数据库读取用户；如无数据库配置则回退 demo 用户
  let user: { id: number; name: string; role: "member" | "admin" } | null = null;
  try {
    const rows = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (rows.length > 0) {
      const u = rows[0] as unknown as { id: number; name: string | null; role: string | null };
      user = { id: u.id, name: u.name || "Deep User", role: (u.role as "member" | "admin") || "member" };
    }
  } catch {
    // 忽略数据库错误，使用 demo 用户
  }

  if (!user) {
    user = { id: 1, name: "Deep User", role: "member" };
  }

  const token = `tk_${Math.random().toString(36).slice(2)}`;
  return NextResponse.json({ code: 200, data: { token, user }, msg: "ok" });
}
