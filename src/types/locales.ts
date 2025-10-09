export const localeOptions = {
  en: { label: "🇺🇸 English" },
  zh: { label: "🇨🇳 中文" },
  ja: { label: "🇯🇵 日本語" },
  ko: { label: "🇰🇷 한국어" },
} as const;

export type AppLocale = keyof typeof localeOptions;
