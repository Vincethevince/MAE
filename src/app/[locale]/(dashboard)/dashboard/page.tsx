import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { CheckCircle2, Circle } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import {
  getCurrentProvider,
  getProviderServices,
  getProviderRevenue30Days,
  getProviderAppointmentsRange,
} from "@/lib/supabase/queries";
import type { AppointmentWithProviderAndService } from "@/lib/supabase/queries";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface DashboardPageProps {
  params: Promise<{ locale: string }>;
}

type AppointmentStatus = AppointmentWithProviderAndService["status"];

function getStatusClassName(status: AppointmentStatus): string {
  switch (status) {
    case "confirmed":
      return "bg-green-100 text-green-800 border-green-200";
    case "pending":
      return "bg-yellow-100 text-yellow-800 border-yellow-200";
    case "cancelled":
      return "bg-gray-100 text-gray-600 border-gray-200";
    case "completed":
      return "bg-blue-100 text-blue-800 border-blue-200";
    case "no_show":
      return "bg-red-100 text-red-800 border-red-200";
    default:
      return "";
  }
}

function formatRevenue(cents: number, locale: string): string {
  return new Intl.NumberFormat(locale === "de" ? "de-DE" : "en-GB", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);
}

function formatTime(iso: string, locale: string): string {
  return new Date(iso).toLocaleTimeString(
    locale === "de" ? "de-DE" : "en-GB",
    { hour: "2-digit", minute: "2-digit", hour12: false }
  );
}

export default async function DashboardPage({ params }: DashboardPageProps) {
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

  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(now);
  todayEnd.setHours(23, 59, 59, 999);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;

  const [services, revenueCents, todaysAppointments, { count: upcomingCount }, availabilityRows] =
    await Promise.all([
      getProviderServices(supabase, provider.id),
      getProviderRevenue30Days(supabase, provider.id),
      getProviderAppointmentsRange(supabase, provider.id, todayStart, todayEnd),
      db
        .from("appointments")
        .select("id", { count: "exact", head: true })
        .eq("provider_id", provider.id)
        .gte("start_time", now.toISOString())
        .in("status", ["pending", "confirmed"]),
      db
        .from("availability")
        .select("id", { count: "exact", head: true })
        .eq("provider_id", provider.id)
        .is("employee_id", null),
    ]);

  const hasServices = services.length > 0;
  const hasAvailability = (availabilityRows.count ?? 0) > 0;
  const hasDescription = Boolean(provider.description);
  const setupComplete = hasServices && hasAvailability;

  const t = await getTranslations("dashboard");
  const tStatus = await getTranslations("appointments");

  // Filter cancelled appointments from today's list (noise)
  const visibleToday = todaysAppointments.filter(
    (a) => a.status !== "cancelled"
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("overview.title")}</h1>
        <p className="text-muted-foreground">{provider.business_name}</p>
      </div>

      {/* Setup checklist — only visible until all steps are done */}
      {!setupComplete && (
        <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{t("setup.title")}</CardTitle>
            <p className="text-sm text-muted-foreground">{t("setup.subtitle")}</p>
          </CardHeader>
          <CardContent className="space-y-2">
            {[
              { done: true, label: t("setup.stepProfile"), href: null },
              {
                done: hasServices,
                label: t("setup.stepServices"),
                href: `/${locale}/dashboard/services`,
              },
              {
                done: hasAvailability,
                label: t("setup.stepAvailability"),
                href: `/${locale}/dashboard/availability`,
              },
              {
                done: hasDescription,
                label: t("setup.stepDescription"),
                href: `/${locale}/dashboard/settings`,
              },
            ].map((step, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                {step.done ? (
                  <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                ) : (
                  <Circle className="h-4 w-4 text-muted-foreground shrink-0" />
                )}
                {step.href && !step.done ? (
                  <Link href={step.href} className="hover:underline text-primary">
                    {step.label}
                  </Link>
                ) : (
                  <span className={step.done ? "text-muted-foreground line-through" : ""}>{step.label}</span>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("overview.services")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{services.length}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("overview.upcomingAppointments")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{upcomingCount ?? 0}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("overview.rating")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              {provider.rating > 0
                ? provider.rating.toFixed(1)
                : t("overview.noRating")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("overview.revenue30Days")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              {formatRevenue(revenueCents, locale)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Today's appointments */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {t("overview.todaysAppointments")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {visibleToday.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t("overview.noAppointmentsToday")}
            </p>
          ) : (
            <div className="space-y-2">
              {visibleToday.map((appt) => (
                <div
                  key={appt.id}
                  className="flex items-center justify-between gap-4 rounded-lg border bg-card p-3"
                >
                  <div className="flex items-center gap-4">
                    <span className="font-mono text-sm font-medium w-12 shrink-0">
                      {formatTime(appt.start_time, locale)}
                    </span>
                    <div>
                      {/* providerName field holds the customer's full_name
                          (naming is inherited from the shared type) */}
                      <p className="font-medium text-sm">{appt.providerName || "—"}</p>
                      <p className="text-xs text-muted-foreground">
                        {appt.serviceName}
                      </p>
                    </div>
                  </div>
                  <Badge
                    className={getStatusClassName(appt.status)}
                    variant="outline"
                  >
                    {tStatus(`status.${appt.status}`)}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
