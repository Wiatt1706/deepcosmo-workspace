/**
 * OAuth登录API - 极简设计
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const provider = searchParams.get("provider") as "github" | "google";
  const redirectTo = searchParams.get("redirectTo");
  const locale = searchParams.get("locale") || "zh";

  if (!provider || !["github", "google"].includes(provider)) {
    return NextResponse.json(
      { error: "无效的登录提供商" },
      { status: 400 }
    );
  }

  try {
    const url = await auth.getOAuthUrl(provider, redirectTo || undefined, locale);
    return NextResponse.json({ url });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "获取登录链接失败" },
      { status: 500 }
    );
  }
}