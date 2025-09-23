import { NextResponse } from "next/server";

export async function POST() {
  // 简化：如果已存在 access_token，则模拟续期返回新 token
  // 真实场景应使用 refresh_token 校验
  const newToken = `tk_${Math.random().toString(36).slice(2)}`;
  return NextResponse.json({ code: 200, data: { token: newToken }, msg: "ok" });
}
