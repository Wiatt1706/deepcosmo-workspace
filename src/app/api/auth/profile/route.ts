import { NextRequest, NextResponse } from "next/server";
import { verifyAccessToken, updateUser, updateProfile, getUserWithProfile } from "@/lib/services/auth";
import { UpdateUserSchema, UpdateProfileSchema } from "@/lib/schemas/auth";

// 获取用户资料
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
    const message = error instanceof Error ? error.message : "获取用户资料失败";
    return NextResponse.json({ code: 401, data: null, msg: message }, { status: 401 });
  }
}

// 更新用户资料
export async function PUT(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const accessToken = authHeader?.replace("Bearer ", "") || 
                     request.headers.get("access_token");

  if (!accessToken) {
    return NextResponse.json({ code: 401, data: null, msg: "缺少访问令牌" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  
  // 分离用户信息和资料信息
  const userData: Record<string, unknown> = {};
  const profileData: Record<string, unknown> = {};
  
  Object.keys(body).forEach(key => {
    if (["name", "avatar"].includes(key)) {
      userData[key] = body[key];
    } else {
      profileData[key] = body[key];
    }
  });

  try {
    const user = await verifyAccessToken(accessToken);
    
    // 更新用户信息
    if (Object.keys(userData).length > 0) {
      const userParse = UpdateUserSchema.safeParse(userData);
      if (!userParse.success) {
        const message = userParse.error.issues.map(i => i.message).join("; ");
        return NextResponse.json({ code: 400, data: null, msg: `用户信息更新失败: ${message}` }, { status: 400 });
      }
      await updateUser(user.id, userParse.data);
    }

    // 更新用户资料
    if (Object.keys(profileData).length > 0) {
      const profileParse = UpdateProfileSchema.safeParse(profileData);
      if (!profileParse.success) {
        const message = profileParse.error.issues.map(i => i.message).join("; ");
        return NextResponse.json({ code: 400, data: null, msg: `用户资料更新失败: ${message}` }, { status: 400 });
      }
      await updateProfile(user.id, profileParse.data);
    }

    // 返回更新后的完整信息
    const { user: updatedUser, profile } = await getUserWithProfile(user.id);
    
    return NextResponse.json({ code: 200, data: { user: updatedUser, profile }, msg: "ok" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "更新用户资料失败";
    return NextResponse.json({ code: 500, data: null, msg: message }, { status: 500 });
  }
}
