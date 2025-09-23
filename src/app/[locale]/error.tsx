"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";

type Props = {
  error: Error;
  reset(): void;
};

export default function Error({ error, reset }: Props) {
  const t = useTranslations("Error");

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div vaul-drawer-wrapper="">
      <div className="relative flex min-h-svh flex-col bg-background">
        <div data-wrapper="" className="border-grid flex flex-1 flex-col">
          <div className="flex flex-1 items-center justify-center">
            <div className="flex max-w-3xl flex-col items-center justify-center gap-4 p-4">
              <h1 className="text-2xl font-bold">DeepCosmo</h1>
              <p className="text-muted-foreground">{t("title")}</p>
              <Button onClick={() => reset()} variant="outline">
                {t("retry")}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
