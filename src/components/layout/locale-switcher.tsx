"use client";

import { useLocale } from "next-intl";

import { localeOptions } from "@/types/locales";
import LocaleSwitcherDropdown from "./locale-switcher-select";

export default function LocaleSwitcher() {
  const locale = useLocale();
  const options = Object.entries(localeOptions).map(([code, { label }]) => ({
    code,
    label,
  }));

  return (
    <>
      <LocaleSwitcherDropdown
        defaultValue={locale}
        label={"Language"}
        options={options}
      />
    </>
  );
}

