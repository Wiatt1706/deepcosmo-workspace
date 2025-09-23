"use client";

import { usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { Button } from "@/components/ui/button";

export function LocaleSwitcher() {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <div className="flex items-center gap-2">
      {routing.locales.map(locale => (
        <Button
          key={locale}
          size="sm"
          variant="outline"
          onClick={() => router.replace({ pathname }, { locale })}
        >
          {locale.toUpperCase()}
        </Button>
      ))}
    </div>
  );
}
