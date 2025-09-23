import "../globals.css";
import type { Metadata } from "next";
import { hasLocale, Locale, NextIntlClientProvider } from "next-intl";
import { setRequestLocale, getMessages } from "next-intl/server";
import { notFound } from "next/navigation";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { ReactNode } from "react";
import NextTopLoader from "nextjs-toploader";
import { Toaster as ToasterSonner } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/layout/theme-provider";
import { Navbar } from "@/components/layout/navbar";
import { routing } from "@/i18n/routing";
import env from "@/config/env";
import clsx from "clsx";

interface PageProps {
  params: Promise<{ locale: string }>;
  children: ReactNode;
}

const siteUrl = new URL(env.FRONTEND_BASE_URL);

export const metadata: Metadata = {
  metadataBase: siteUrl,
  title: "DeepCosmo",
  description: "DeepCosmo - 轻量、现代、可复用的小团队前端模板。",
  openGraph: {
    type: "website",
    url: siteUrl,
    title: "DeepCosmo",
    description: "DeepCosmo - 轻量、现代、可复用的小团队前端模板。",
    siteName: "DeepCosmo",
  },
  twitter: {
    card: "summary_large_image",
    title: "DeepCosmo",
    description: "DeepCosmo - 轻量、现代、可复用的小团队前端模板。",
  },
  alternates: {
    languages: Object.fromEntries(
      routing.locales.map(l => [l, new URL(`/${l}`, siteUrl).toString()])
    ),
  },
};

export function generateStaticParams() {
  return routing.locales.map(locale => ({ locale }));
}

export default async function RootLayout({ children, params }: PageProps) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);
  const messages = await getMessages();

  return (
    <html className="h-full w-full" lang={locale} suppressHydrationWarning>
      <body className={clsx("flex-1 h-full flex-col overflow-hidden")}>
        <NextTopLoader color="#16a34a" showSpinner={false} height={2} />
        <NextIntlClientProvider messages={messages}>
          <ThemeProvider>
            <NuqsAdapter>
              <Navbar />
              <ToasterSonner position="top-center" />
              {children}
            </NuqsAdapter>
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
