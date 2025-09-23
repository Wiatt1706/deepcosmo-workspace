import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";

export default function RootPage() {
  const t = useTranslations("Home");
  return (
    <main className="mx-auto max-w-4xl px-4 py-16">
      <h1 className="text-3xl font-bold">{t("title")}</h1>
      <p className="mt-2 text-muted-foreground">{t("subtitle")}</p>
      <div className="mt-6 flex gap-3">
        <Link href="/login" className="inline-flex h-10 items-center rounded-md bg-primary px-6 text-primary-foreground">{t("getStarted")}</Link>
        <Link href="/dashboard" className="inline-flex h-10 items-center rounded-md border px-6">{t("seeDemo")}</Link>
      </div>
    </main>
  );
}
