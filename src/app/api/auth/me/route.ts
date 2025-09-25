import { NextRequest, NextResponse } from "next/server";
import { verifyAccessToken, getUserWithProfile } from "@/lib/services/auth";

// 获取当前用户信息
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const accessToken = authHeader?.replace("Bearer ", "") || 
                     request.headers.get("access_token");

  if (!accessToken) {
    return NextResponse.json({ code: 401, data: null, msg: "缺少访问令牌" }, { status: 401 });
  }

  try {
    const user = await verifyAccessToken(accessToken);
    const { profile } = await getUserWithProfile(user.id);
    
    return NextResponse.json({ code: 200, data: { user, profile }, msg: "ok" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "获取用户信息失败";
    return NextResponse.json({ code: 401, data: null, msg: message }, { status: 401 });
  }
}

