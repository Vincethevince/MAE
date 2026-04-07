import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { createClient } from "@/lib/supabase/server";
import {
  getCurrentProvider,
  getProviderMonthStats,
} from "@/lib/supabase/queries";
import type { ProviderMonthStats } from "@/lib/supabase/queries";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface AnalyticsPageProps {
  params: Promise<{ locale: string }>;
}

/** Returns % change from previous to current, or null when previous is 0. */
function pctChange(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return Math.round(((current - previous) / previous) * 100);
}

function formatRevenue(cents: number, locale: string): string {
  return new Intl.NumberFormat(locale === "de" ? "de-DE" : "en-GB", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);
}

type AppointmentStatus = keyof ProviderMonthStats["statusBreakdown"];

const STATUS_CONFIG: { key: AppointmentStatus; bg: string }[] = [
  { key: "completed",  bg: "bg-blue-500"   },
  { key: "confirmed",  bg: "bg-green-500"  },
  { key: "pending",    bg: "bg-yellow-500" },
  { key: "cancelled",  bg: "bg-gray-400"   },
  { key: "no_show",    bg: "bg-red-500"    },
];

export default async function AnalyticsPage({ params }: AnalyticsPageProps) {
  const { locale } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/login`);
  }

  const provider = await getCurrentProvider(supabase);

  if (!provider) {
    redirect(`/${locale}/dashboard/onboarding`);
  }

  const [stats, t, tStatus] = await Promise.all([
    getProviderMonthStats(supabase, provider.id),
    getTranslations("dashboard.analytics"),
    getTranslations("appointments"),
  ]);

  const completedPct = pctChange(
    stats.currentCompletedCount,
    stats.previousCompletedCount
  );
  const revenuePct = pctChange(
    stats.currentRevenueCents,
    stats.previousRevenueCents
  );

  const totalThisMonth = Object.values(stats.statusBreakdown).reduce(
    (sum, n) => sum + n,
    0
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="text-muted-foreground">{t("subtitle")}</p>
      </div>

      {/* Month comparison KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("completedAppointments")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.currentCompletedCount}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {t("previousMonth")}: {stats.previousCompletedCount}
              {completedPct !== null && (
                <span
                  className={
                    completedPct >= 0
                      ? "ml-2 text-green-600 font-medium"
                      : "ml-2 text-red-600 font-medium"
                  }
                >
                  {completedPct >= 0 ? "+" : ""}
                  {completedPct}%
                </span>
              )}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("revenue")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              {formatRevenue(stats.currentRevenueCents, locale)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {t("previousMonth")}: {formatRevenue(stats.previousRevenueCents, locale)}
              {revenuePct !== null && (
                <span
                  className={
                    revenuePct >= 0
                      ? "ml-2 text-green-600 font-medium"
                      : "ml-2 text-red-600 font-medium"
                  }
                >
                  {revenuePct >= 0 ? "+" : ""}
                  {revenuePct}%
                </span>
              )}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Status breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("statusBreakdown")}</CardTitle>
        </CardHeader>
        <CardContent>
          {totalThisMonth === 0 ? (
            <p className="text-sm text-muted-foreground">{t("noData")}</p>
          ) : (
            <div className="space-y-3">
              {STATUS_CONFIG.map(({ key, bg }) => {
                const count = stats.statusBreakdown[key] ?? 0;
                const pct =
                  totalThisMonth > 0
                    ? Math.round((count / totalThisMonth) * 100)
                    : 0;
                return (
                  <div key={key}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-muted-foreground">
                        {tStatus(`status.${key}`)}
                      </span>
                      <span className="font-medium tabular-nums">
                        {count}{" "}
                        <span className="text-muted-foreground font-normal">
                          ({pct}%)
                        </span>
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className={`h-full rounded-full ${bg}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Top 5 services */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("topServices")}</CardTitle>
        </CardHeader>
        <CardContent>
          {stats.topServices.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("noData")}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground text-left">
                    <th className="pb-2 font-medium">{t("serviceColumn")}</th>
                    <th className="pb-2 font-medium text-right">
                      {t("bookingsColumn")}
                    </th>
                    <th className="pb-2 font-medium text-right">
                      {t("revenueColumn")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {stats.topServices.map((svc, i) => (
                    <tr key={svc.serviceId} className="border-b last:border-0">
                      <td className="py-2">
                        <span className="text-muted-foreground mr-2 tabular-nums">
                          {i + 1}.
                        </span>
                        {svc.serviceName}
                      </td>
                      <td className="py-2 text-right tabular-nums">
                        {svc.completedCount}
                      </td>
                      <td className="py-2 text-right tabular-nums font-medium">
                        {formatRevenue(svc.revenueCents, locale)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
