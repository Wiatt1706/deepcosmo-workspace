import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getOAuthUrl, handleOAuthCallback } from "@/lib/services/auth";
import { OAuthLoginSchema, OAuthCallbackSchema } from "@/lib/schemas/auth";

// 获取三方登录 URL
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const provider = searchParams.get("provider");
  const redirectTo = searchParams.get("redirectTo");

  const parse = OAuthLoginSchema.safeParse({ 
    provider, 
    redirectTo: redirectTo || undefined 
  });

  if (!parse.success) {
    const message = parse.error.issues.map((i: { message: string }) => i.message).join("; ");
    return NextResponse.json({ code: 400, data: null, msg: message }, { status: 400 });
  }

  try {
    const authUrl = await getOAuthUrl(parse.data.provider, parse.data.redirectTo);
    
    return NextResponse.json({ code: 200, data: { authUrl }, msg: "ok" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "获取登录链接失败";
    return NextResponse.json({ code: 500, data: null, msg: message }, { status: 500 });
  }
}

// 处理三方登录回调
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  
  const parse = OAuthCallbackSchema.safeParse(body);
  if (!parse.success) {
    const message = parse.error.issues.map((i: { message: string }) => i.message).join("; ");
    return NextResponse.json({ code: 400, data: null, msg: message }, { status: 400 });
  }

  const { code, state } = parse.data;
  
  // 从 state 中解析 provider（实际项目中应该更安全地处理）
  const provider = state?.split(":")[0] as z.infer<typeof OAuthLoginSchema>["provider"] | undefined;
  
  if (!provider) {
    return NextResponse.json({ code: 400, data: null, msg: "缺少提供商信息" }, { status: 400 });
  }

  try {
    const session = await handleOAuthCallback(provider, code);
    
    return NextResponse.json({ code: 200, data: session, msg: "ok" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "登录失败";
    return NextResponse.json({ code: 500, data: null, msg: message }, { status: 500 });
  }
}

