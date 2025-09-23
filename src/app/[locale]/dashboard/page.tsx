"use client";

import useSWR from "swr";
import { useTranslations } from "next-intl";
import apiRoute from "@/lib/services/api-route";
import { API } from "@/lib/services/endpoints";

const fetcher = () => apiRoute.get(API.COMMON.ME);

export default function DashboardPage() {
  const t = useTranslations("Dashboard");
  const { data, error, isLoading, mutate } = useSWR("me", fetcher);

  const me = (data as unknown)?.data;

  return (
    <div className="p-6 space-y-2">
      <h1 className="text-2xl font-semibold">{t("title")}</h1>
      {isLoading ? <p>{t("loading")}</p> : null}
      {error ? (
        <div className="text-destructive">{t("loadError")}</div>
      ) : null}
      {me ? (
        <div className="rounded-md border p-4">
          <div>
            {t("user")}：{me.name}
          </div>
          <div>
            {t("role")}：{me.role}
          </div>
        </div>
      ) : null}
      <button className="rounded-md border px-3 py-2" onClick={() => mutate()}>
        {t("refresh")}
      </button>
    </div>
  );
}
