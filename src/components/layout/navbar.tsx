"use client";

import { ThemeToggle } from "@/components/layout/theme-toggle";
import { UserMenu } from "@/components/auth/user-menu";
import { Link } from "@/i18n/navigation";
import { useAuthStatus } from "@/lib/auth/hooks";
import LocaleSwitcher from "./locale-switcher";

export function Navbar() {
  const isAuthenticated = useAuthStatus();

  return (
    <header className="w-full border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="font-semibold">DeepCosmo</Link>
        <div className="flex items-center gap-2">
          <LocaleSwitcher />
          <ThemeToggle />
          {isAuthenticated && <UserMenu />}
        </div>
      </div>
    </header>
  );
}
