"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import apiRoute from "@/lib/services/api-route";

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("正在处理登录...");

  useEffect(() => {
    const handleCallback = async () => {
      try {
        setMessage("正在验证登录信息...");
        
        // 收集查询参数
        const params: Record<string, string> = {};
        searchParams.forEach((value, key) => {
          params[key] = value;
        });
        
        // 处理hash参数（GitHub OAuth返回的token在hash中）
        if (typeof window !== "undefined" && window.location.hash) {
          const hash = window.location.hash.substring(1);
          const hashParams = new URLSearchParams(hash);
          hashParams.forEach((value, key) => {
            params[key] = value;
          });
        }
        
        // 检查是否有认证参数
        if (!params.access_token && !params.code && !params.error) {
          setStatus("error");
          setMessage("未找到认证参数");
          toast.error("认证失败：未找到认证参数");
          setTimeout(() => {
            router.push("/login");
          }, 3000);
          return;
        }
        
        // 使用统一的认证API处理回调
        const response = await apiRoute.post<{ success: boolean; user?: { name?: string; email?: string }; error?: string }>("/auth/session", { params });

        if (response.success) {
          setStatus("success");
          setMessage(`欢迎回来，${response.user?.name || response.user?.email}！`);
          toast.success("登录成功！");
          
          // 延迟跳转，让用户看到成功消息
          setTimeout(() => {
            router.push("/dashboard");
          }, 1500);
        } else {
          throw new Error(response.error || "登录失败");
        }
      } catch (error) {
        setStatus("error");
        const errorMessage = error instanceof Error ? error.message : "登录失败";
        setMessage(errorMessage);
        toast.error(errorMessage);
        
        // 延迟跳转到登录页
        setTimeout(() => {
          router.push("/login");
        }, 3000);
      }
    };

    handleCallback();
  }, [router, searchParams]);

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

