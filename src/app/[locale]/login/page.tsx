"use client";

import { useTranslations, useLocale } from "next-intl";
import { useState } from "react";
import { setCookie } from "nookies";
import apiRoute from "@/lib/services/api-route";
import { API } from "@/lib/services/endpoints";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function LoginPage() {
  const t = useTranslations("Login");
  const locale = useLocale();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  function validate() {
    const next: { email?: string; password?: string } = {};
    if (!email.trim()) next.email = t("loginError.emailRequired");
    if (!password.trim()) next.password = t("loginError.passwordRequired");
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (loading) return;
    if (!validate()) return;

    try {
      setLoading(true);
      const res = await apiRoute.post<{ token: string }>(API.AUTH.LOGIN, {
        email: email.trim(),
        password: password.trim(),
      });
      const token = res?.data?.token;
      if (!token) throw new Error("No token returned");
      setCookie(null, "access_token", token, {
        path: "/",
        maxAge: 60 * 60 * 24 * 7,
        sameSite: "lax",
        secure: typeof window !== "undefined" && window.location.protocol === "https:",
      });
      toast.success("登录成功");
      window.location.href = `/${locale}/dashboard`;
    } catch {
      toast.error("登录失败，请检查账号或稍后再试");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-[calc(100svh-3.5rem)] items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-4">
        <div className="text-center space-y-1">
          <h1 className="text-xl font-semibold">DeepCosmo</h1>
          <p className="text-muted-foreground">{t("title")}</p>
        </div>
        <form className="space-y-3" onSubmit={onSubmit} noValidate>
          <div className="space-y-1">
            <label className="text-sm" htmlFor="email">{t("email")}</label>
            <input
              name="email"
              id="email"
              type="email"
              autoComplete="email"
              className="w-full rounded-md border bg-background px-3 py-2"
              placeholder="you@example.com"
              aria-invalid={!!errors.email}
              onChange={e => {
                setEmail(e.target.value);
                if (errors.email) setErrors(prev => ({ ...prev, email: undefined }));
              }}
              value={email}
              required
            />
            {errors.email ? (
              <p className="text-xs text-destructive">{errors.email}</p>
            ) : null}
          </div>
          <div className="space-y-1">
            <label className="text-sm" htmlFor="password">{t("password")}</label>
            <input
              name="password"
              id="password"
              type="password"
              autoComplete="current-password"
              className="w-full rounded-md border bg-background px-3 py-2"
              aria-invalid={!!errors.password}
              onChange={e => {
                setPassword(e.target.value);
                if (errors.password) setErrors(prev => ({ ...prev, password: undefined }));
              }}
              value={password}
              required
            />
            {errors.password ? (
              <p className="text-xs text-destructive">{errors.password}</p>
            ) : null}
          </div>
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" />
              {t("rememberMe")}
            </label>
            <Button variant="link" type="button" className="p-0 text-sm">
              {t("forgotPassword")}
            </Button>
          </div>
          <Button disabled={loading} type="submit" className="w-full">{loading ? "登录中..." : t("loginButton")}</Button>
        </form>
        <div className="text-center text-sm">
          {t("account")} · <Button variant="link" className="p-0" type="button">{t("register")}</Button>
        </div>
      </div>
    </div>
  );
}
