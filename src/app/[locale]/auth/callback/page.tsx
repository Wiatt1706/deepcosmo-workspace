"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { setCookie } from "nookies";
import apiRoute from "@/lib/services/api-route";
import { toast } from "sonner";

export default function AuthCallbackPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const locale = typeof window !== "undefined" ? (window.location.pathname.match(/^\/(\w{2})\//)?.[1] || "zh") : "zh";
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("正在处理登录...");

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get("code");
      const state = searchParams.get("state");
      const error = searchParams.get("error");

      if (error) {
        setStatus("error");
        setMessage(`登录失败: ${error}`);
        toast.error(`登录失败: ${error}`);
        return;
      }

      if (!code) {
        setStatus("error");
        setMessage("缺少授权码");
        toast.error("登录失败: 缺少授权码");
        return;
      }

      try {
        setMessage("正在验证登录信息...");
        
        const res = await apiRoute.post<{ accessToken: string; user: { name?: string; email: string } }>("/auth/oauth", {
          code,
          state,
        });

        if (res.code === 200 && res.data) {
          const { accessToken, user } = res.data as { accessToken: string; user: { name?: string; email: string } };
          
          // 保存访问令牌
          setCookie(null, "access_token", accessToken, {
            path: "/",
            maxAge: 60 * 60 * 24 * 7, // 7天
            sameSite: "lax",
            secure: typeof window !== "undefined" && window.location.protocol === "https:",
          });

          setStatus("success");
          setMessage(`欢迎回来，${user.name || user.email}！`);
          toast.success("登录成功！");
          
          // 延迟跳转，让用户看到成功消息
          setTimeout(() => {
            router.push(`/${locale}/dashboard`);
          }, 1500);
        } else {
          throw new Error((res as unknown as { msg?: string }).msg || "登录失败");
        }
      } catch (error) {
        setStatus("error");
        const errorMessage = error instanceof Error ? error.message : "登录失败";
        setMessage(errorMessage);
        toast.error(errorMessage);
        
        // 延迟跳转到登录页
        setTimeout(() => {
          router.push(`/${locale}/login`);
        }, 3000);
      }
    };

    handleCallback();
  }, [searchParams, router, locale]);

  return (
    <div className="flex min-h-[calc(100svh-3.5rem)] items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-4 text-center">
        <div className="space-y-2">
          {status === "loading" && (
            <div className="flex items-center justify-center space-x-2">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <span className="text-sm text-muted-foreground">{message}</span>
            </div>
          )}
          
          {status === "success" && (
            <div className="space-y-2">
              <div className="mx-auto h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-sm text-green-600">{message}</p>
              <p className="text-xs text-muted-foreground">正在跳转到仪表板...</p>
            </div>
          )}
          
          {status === "error" && (
            <div className="space-y-2">
              <div className="mx-auto h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
                <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <p className="text-sm text-red-600">{message}</p>
              <p className="text-xs text-muted-foreground">正在跳转到登录页...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

