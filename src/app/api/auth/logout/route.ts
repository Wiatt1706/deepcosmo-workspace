import { NextResponse } from "next/server";

export async function POST() {
  // 登出接口，实际场景可能需要服务端撤销 token
  return NextResponse.json({ code: 200, data: null, msg: "登出成功" });
}
