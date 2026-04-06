import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { createClient } from "@/lib/supabase/server";
import {
  getProviderById,
  getServiceById,
  getAppointmentsForDate,
  getProviderBlocksForDateRange,
} from "@/lib/supabase/queries";
import { computeAvailableSlots } from "@/lib/booking";
import type { BlockInterval } from "@/lib/booking";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { DateTimePicker } from "./DateTimePicker";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface BookingPageProps {
  params: Promise<{ locale: string; providerId: string; serviceId: string }>;
}

function formatPrice(cents: number, locale: string): string {
  return new Intl.NumberFormat(locale === "de" ? "de-DE" : "en-GB", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);
}

export default async function BookingPage({ params }: BookingPageProps) {
  const { locale, providerId, serviceId } = await params;

  if (!UUID_REGEX.test(providerId) || !UUID_REGEX.test(serviceId)) {
    notFound();
  }

  const supabase = await createClient();

  // Require authentication
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/login?next=/${locale}/book/${providerId}/${serviceId}`);
  }

  const [provider, service] = await Promise.all([
    getProviderById(supabase, providerId),
    getServiceById(supabase, serviceId),
  ]);

  if (!provider) notFound();
  if (!service || service.provider_id !== providerId) notFound();

  const t = await getTranslations("booking");
  const tCommon = await getTranslations("common");

  // Build next 14 days
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const futureDates: Date[] = [];
  for (let i = 0; i < 14; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    futureDates.push(d);
  }

  // Fetch provider blocks for the full 14-day range once
  const rangeEnd = new Date(today);
  rangeEnd.setDate(today.getDate() + 14);
  const allBlocks = await getProviderBlocksForDateRange(supabase, providerId, today, rangeEnd);

  // Pre-compute slots for each date
  const slotsByDate: Record<string, Array<{ startTime: string; endTime: string }>> = {};

  for (const date of futureDates) {
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    // Filter blocks that overlap this day
    const dayBlocks: BlockInterval[] = allBlocks.filter((b) => {
      const bStart = new Date(b.start_time);
      const bEnd = new Date(b.end_time);
      return bStart < dayEnd && bEnd > dayStart;
    });

    const existingAppointments = await getAppointmentsForDate(supabase, providerId, date);
    const slots = computeAvailableSlots(
      date,
      provider.availability,
      existingAppointments,
      service.duration_minutes,
      dayBlocks
    );
    const dateKey = date.toISOString().split("T")[0] ?? "";
    slotsByDate[dateKey] = slots.map((s) => ({
      startTime: s.startTime.toISOString(),
      endTime: s.endTime.toISOString(),
    }));
  }

  const dateFormatter = new Intl.DateTimeFormat(locale === "de" ? "de-DE" : "en-GB", {
    month: "short",
    day: "numeric",
  });
  const dayFormatter = new Intl.DateTimeFormat(locale === "de" ? "de-DE" : "en-GB", {
    weekday: "short",
  });

  const dates = futureDates.map((d) => ({
    date: d.toISOString().split("T")[0] ?? "",
    label: dateFormatter.format(d),
    dayLabel: dayFormatter.format(d),
  }));

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">{t("pageTitle")}</h1>

      {/* Provider & service summary */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-base">{t("bookingDetails")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">{t("provider")}</span>
            <span className="font-medium">{provider.business_name}</span>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">{t("service")}</span>
            <div className="flex items-center gap-2">
              <span className="font-medium">{service.name}</span>
              <Badge variant="secondary">
                {service.duration_minutes} {t("minutes")}
              </Badge>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">{t("price")}</span>
            <span className="font-semibold">{formatPrice(service.price_cents, locale)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Date + time slot picker */}
      <h2 className="text-lg font-semibold mb-4">{t("selectTime")}</h2>
      <DateTimePicker
        dates={dates}
        slotsByDate={slotsByDate}
        locale={locale}
        providerId={providerId}
        serviceId={serviceId}
        labels={{
          noSlots: t("noSlotsAvailable"),
          selectDate: tCommon("next"),
        }}
      />
    </div>
  );
}
