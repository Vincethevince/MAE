import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { CalendarPlus } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { getAppointmentById } from "@/lib/supabase/queries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/lib/button-variants";
import { Separator } from "@/components/ui/separator";

interface SuccessPageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ appointmentId?: string }>;
}

function formatPrice(cents: number, locale: string): string {
  return new Intl.NumberFormat(locale === "de" ? "de-DE" : "en-GB", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);
}

function formatDateTime(iso: string, locale: string): string {
  const d = new Date(iso);
  const localeStr = locale === "de" ? "de-DE" : "en-GB";
  return d.toLocaleString(localeStr, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export default async function SuccessPage({
  params,
  searchParams,
}: SuccessPageProps) {
  const { locale } = await params;
  const { appointmentId } = await searchParams;

  const t = await getTranslations("booking");
  const tCommon = await getTranslations("common");

  let appointment = null;

  if (appointmentId) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const appt = await getAppointmentById(supabase, appointmentId);
      // Only show appointment details to the user who booked it
      if (appt && appt.user_id === user.id) {
        appointment = appt;
      }
    }
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-16 text-center">
      <div className="mb-6 text-5xl">&#10003;</div>
      <h1 className="text-2xl font-bold mb-2">{t("successTitle")}</h1>
      <p className="text-muted-foreground mb-8">{t("successMessage")}</p>

      {appointment && (
        <Card className="mb-8 text-left">
          <CardHeader>
            <CardTitle className="text-base">{t("appointmentSummary")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-start justify-between">
              <span className="text-muted-foreground">{t("provider")}</span>
              <span className="font-medium">{appointment.provider.business_name}</span>
            </div>
            <Separator />
            <div className="flex items-start justify-between">
              <span className="text-muted-foreground">{t("service")}</span>
              <span className="font-medium">{appointment.service.name}</span>
            </div>
            <Separator />
            <div className="flex items-start justify-between">
              <span className="text-muted-foreground">{t("dateTime")}</span>
              <span className="font-medium text-right max-w-48">
                {formatDateTime(appointment.start_time, locale)}
              </span>
            </div>
            <Separator />
            <div className="flex items-start justify-between">
              <span className="text-muted-foreground">{t("price")}</span>
              <span className="font-semibold">
                {formatPrice(appointment.price_cents, locale)}
              </span>
            </div>
            <Separator />
            <div className="flex items-start justify-between">
              <span className="text-muted-foreground">{t("status")}</span>
              <span className="font-medium capitalize">{t("statusPending")}</span>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-col gap-3">
        {appointment && (
          <a
            href={`/api/appointments/${appointment.id}/ics`}
            download
            className={buttonVariants({ variant: "outline", className: "w-full" })}
          >
            <CalendarPlus className="mr-2 h-4 w-4" />
            {t("addToCalendar")}
          </a>
        )}
        <Link
          href={`/${locale}/appointments`}
          className={buttonVariants({ className: "w-full" })}
        >
          {t("viewAppointments")}
        </Link>
        <Link
          href={`/${locale}/search`}
          className={buttonVariants({ variant: "outline", className: "w-full" })}
        >
          {t("backToSearch")}
        </Link>
      </div>
    </div>
  );
}
