"use client";

import { destroyCookie } from "nookies";
import { useLocale } from "next-intl";
import { Button } from "@/components/ui/button";

export function LogoutButton() {
  const locale = useLocale();
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => {
        destroyCookie(null, "access_token", { path: "/" });
        window.location.href = `/${locale}`;
      }}
    >
      退出登录
    </Button>
  );
}
