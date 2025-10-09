"use client";

import { ChevronDown } from "lucide-react";
import { useParams } from "next/navigation";
import { Locale } from "next-intl";
import { useTransition } from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { usePathname, useRouter } from "@/i18n/navigation";

type LocaleOption = {
  code: Locale;
  label: string;
};

type Props = {
  label: string;
  defaultValue: string;
  options: LocaleOption[];
};

export default function LocaleSwitcherDropdown({
  defaultValue,
  options,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const pathname = usePathname();
  const params = useParams();

  function handleSelect(code: Locale) {
    startTransition(() => {
      router.replace(
        // @ts-expect-error -- see previous explanation
        { pathname, params },
        { locale: code }
      );
    });
  }

  const currentLabel =
    options.find(opt => opt.code === defaultValue)?.label || defaultValue;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="gap-1"
          disabled={isPending}
        >
          <span>{currentLabel}</span>
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {options.map(({ code, label }) => (
          <DropdownMenuItem key={code} onClick={() => handleSelect(code)}>
            {label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
