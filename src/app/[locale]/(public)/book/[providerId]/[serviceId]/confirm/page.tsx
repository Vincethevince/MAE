import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { createClient } from "@/lib/supabase/server";
import { getProviderById, getServiceById } from "@/lib/supabase/queries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { confirmAndRedirect } from "@/app/[locale]/(public)/book/actions";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface ConfirmPageProps {
  params: Promise<{ locale: string; providerId: string; serviceId: string }>;
  searchParams: Promise<{ startTime?: string; error?: string }>;
}

function formatPrice(cents: number, locale: string): string {
  return new Intl.NumberFormat(locale === "de" ? "de-DE" : "en-GB", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);
}

function formatDateTime(iso: string, locale: string): { date: string; time: string } {
  const d = new Date(iso);
  const localeStr = locale === "de" ? "de-DE" : "en-GB";
  return {
    date: d.toLocaleDateString(localeStr, {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    }),
    time: d.toLocaleTimeString(localeStr, {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }),
  };
}

export default async function ConfirmPage({
  params,
  searchParams,
}: ConfirmPageProps) {
  const { locale, providerId, serviceId } = await params;
  const { startTime, error: errorKey } = await searchParams;

  if (!UUID_REGEX.test(providerId) || !UUID_REGEX.test(serviceId)) {
    notFound();
  }

  if (!startTime) {
    redirect(`/${locale}/book/${providerId}/${serviceId}`);
  }

  // Validate startTime is a valid ISO datetime and in the future
  const parsedStart = new Date(startTime);
  if (isNaN(parsedStart.getTime()) || parsedStart <= new Date()) {
    redirect(`/${locale}/book/${providerId}/${serviceId}`);
  }

  const supabase = await createClient();

  // Require authentication
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(
      `/${locale}/login?next=/${locale}/book/${providerId}/${serviceId}/confirm?startTime=${encodeURIComponent(startTime)}`
    );
  }

  const [provider, service] = await Promise.all([
    getProviderById(supabase, providerId),
    getServiceById(supabase, serviceId),
  ]);

  if (!provider) notFound();
  if (!service || service.provider_id !== providerId) notFound();

  const t = await getTranslations("booking");
  const tCommon = await getTranslations("common");

  const endTime = new Date(parsedStart.getTime() + service.duration_minutes * 60_000);
  const { date: dateStr, time: timeStr } = formatDateTime(parsedStart.toISOString(), locale);
  const endTimeStr = endTime.toLocaleTimeString(locale === "de" ? "de-DE" : "en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const errorMessages: Record<string, string> = {
    slotNotAvailable: t("slotNotAvailable"),
    bookingFailed: t("bookingFailed"),
    unauthorized: tCommon("error"),
    validationError: tCommon("error"),
  };
  const errorMessage = errorKey ? (errorMessages[errorKey] ?? tCommon("error")) : null;

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">{t("confirmTitle")}</h1>

      {errorMessage && (
        <div className="mb-6 rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          {errorMessage}
        </div>
      )}

      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-base">{t("appointmentSummary")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex items-start justify-between">
            <span className="text-muted-foreground">{t("provider")}</span>
            <span className="font-medium text-right">{provider.business_name}</span>
          </div>
          <Separator />
          <div className="flex items-start justify-between">
            <span className="text-muted-foreground">{t("service")}</span>
            <span className="font-medium text-right">{service.name}</span>
          </div>
          <Separator />
          <div className="flex items-start justify-between">
            <span className="text-muted-foreground">{t("date")}</span>
            <span className="font-medium text-right">{dateStr}</span>
          </div>
          <Separator />
          <div className="flex items-start justify-between">
            <span className="text-muted-foreground">{t("time")}</span>
            <span className="font-medium">
              {timeStr} – {endTimeStr}
            </span>
          </div>
          <Separator />
          <div className="flex items-start justify-between">
            <span className="text-muted-foreground">{t("duration")}</span>
            <span className="font-medium">
              {service.duration_minutes} {t("minutes")}
            </span>
          </div>
          <Separator />
          <div className="flex items-start justify-between">
            <span className="text-muted-foreground">{t("price")}</span>
            <span className="font-semibold text-lg">
              {formatPrice(service.price_cents, locale)}
            </span>
          </div>
        </CardContent>
      </Card>

      <form action={confirmAndRedirect} className="space-y-4">
        <input type="hidden" name="locale" value={locale} />
        <input type="hidden" name="providerId" value={providerId} />
        <input type="hidden" name="serviceId" value={serviceId} />
        <input type="hidden" name="startTime" value={parsedStart.toISOString()} />

        <div className="space-y-1.5">
          <label htmlFor="notes" className="text-sm font-medium">
            {t("notesLabel")}
          </label>
          <textarea
            id="notes"
            name="notes"
            rows={3}
            maxLength={500}
            placeholder={t("notesPlaceholder")}
            className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
          />
          <p className="text-xs text-muted-foreground">{t("notesHint")}</p>
        </div>

        <Button type="submit" className="w-full" size="lg">
          {t("confirmButton")}
        </Button>
      </form>

      <div className="mt-4 text-center">
        <a
          href={`/${locale}/book/${providerId}/${serviceId}`}
          className="text-sm text-muted-foreground hover:text-foreground underline"
        >
          {tCommon("back")}
        </a>
      </div>
    </div>
  );
}
