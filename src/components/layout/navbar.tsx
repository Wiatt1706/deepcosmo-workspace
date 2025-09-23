"use client";

import { ThemeToggle } from "@/components/layout/theme-toggle";
import { LocaleSwitcher } from "@/components/layout/locale-switcher";
import { LogoutButton } from "@/components/layout/logout-button";
import { Link } from "@/i18n/navigation";
import { parseCookies } from "nookies";
import { useEffect, useState } from "react";

export function Navbar() {
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    const hasToken = Boolean(parseCookies().access_token);
    setLoggedIn(hasToken);
  }, []);

  return (
    <header className="w-full border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="font-semibold">DeepCosmo</Link>
        <div className="flex items-center gap-2">
          <LocaleSwitcher />
          <ThemeToggle />
          {loggedIn ? <LogoutButton /> : null}
        </div>
      </div>
    </header>
  );
}
