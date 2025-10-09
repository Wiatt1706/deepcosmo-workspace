/**
 * 统一的认证API - 极简设计
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

// 处理OAuth回调
export async function POST(request: NextRequest) {
  try {
    const { params } = await request.json();
    
    if (!params) {
      return NextResponse.json(
        { error: "缺少回调参数" },
        { status: 400 }
      );
    }
    
    // 构建回调URL，将认证参数放在hash中
    const baseUrl = new URL("/auth/callback", request.url);
    const hashParams: string[] = [];
    const queryParams: Record<string, string> = {};
    
    Object.entries(params).forEach(([key, value]) => {
      const stringValue = value as string;
      // 如果是认证相关的参数，放在hash中
      if (['access_token', 'refresh_token', 'expires_at', 'expires_in', 'provider_token', 'token_type'].includes(key)) {
        hashParams.push(`${key}=${stringValue}`);
      } else {
        queryParams[key] = stringValue;
      }
    });
    
    // 添加查询参数
    Object.entries(queryParams).forEach(([key, value]) => {
      baseUrl.searchParams.set(key, value);
    });
    
    // 添加hash参数
    if (hashParams.length > 0) {
      baseUrl.hash = hashParams.join('&');
    }
    
    const callbackUrl = baseUrl.toString();

    const session = await auth.handleCallback(callbackUrl);
    
    // 设置cookies
    const response = NextResponse.json({
      user: session.user,
      success: true,
    });

    response.cookies.set("access_token", session.accessToken, {
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7天
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });

    if (session.refreshToken) {
      response.cookies.set("refresh_token", session.refreshToken, {
        path: "/",
        maxAge: 60 * 60 * 24 * 30, // 30天
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
      });
    }

    return response;
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "认证失败" },
      { status: 401 }
    );
  }
}

// 获取当前用户
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get("access_token")?.value;
    
    if (!token) {
      return NextResponse.json(
        { error: "未找到访问令牌" },
        { status: 401 }
      );
    }

    const user = await auth.verifyToken(token);
    return NextResponse.json({ user });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "验证失败" },
      { status: 401 }
    );
  }
}

// 登出
export async function DELETE(request: NextRequest) {
  try {
    const token = request.cookies.get("access_token")?.value;
    
    if (token) {
      await auth.signOut();
    }

    const response = NextResponse.json({ success: true });
    
    // 清除cookies
    response.cookies.delete("access_token");
    response.cookies.delete("refresh_token");
    
    return response;
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "登出失败" },
      { status: 500 }
    );
  }
}
