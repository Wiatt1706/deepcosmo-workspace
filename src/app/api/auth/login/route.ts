import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({} as Record<string, unknown>));
  const { email, password } = body || {};

  if (!email || !password) {
    return NextResponse.json(
      { code: 400, data: null, msg: "缺少参数" },
      { status: 400 }
    );
  }

  // demo: 任意账号密码返回一个 token 和 user
  const user = { id: 1, name: "Deep User", role: "member" as const };
  const token = `tk_${Math.random().toString(36).slice(2)}`;

  return NextResponse.json({
    code: 200,
    data: { token, user },
    msg: "ok",
  });
}
