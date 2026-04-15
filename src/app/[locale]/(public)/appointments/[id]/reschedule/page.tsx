import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import Link from "next/link";

import { createClient } from "@/lib/supabase/server";
import {
  getProviderById,
  getAppointmentsForDate,
  getProviderBlocksForDateRange,
} from "@/lib/supabase/queries";
import { computeAvailableSlots } from "@/lib/booking";
import type { BlockInterval } from "@/lib/booking";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/lib/button-variants";
import { ReschedulePicker } from "./ReschedulePicker";
import { rescheduleAppointment } from "./actions";
import type { Database } from "@/types/database";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type AppointmentRow = Database["public"]["Tables"]["appointments"]["Row"];

interface ReschedulePageProps {
  params: Promise<{ locale: string; id: string }>;
}

async function rescheduleAction(formData: FormData): Promise<{ error?: string; success?: true }> {
  "use server";
  const result = await rescheduleAppointment(formData);
  if ("error" in result) return { error: result.error };
  return { success: true };
}

export default async function ReschedulePage({ params }: ReschedulePageProps) {
  const { locale, id } = await params;

  // 1. UUID-validate id
  if (!UUID_REGEX.test(id)) {
    notFound();
  }

  const supabase = await createClient();

  // 2. Auth check
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/login`);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;

  // 3. Fetch appointment with provider and service data
  const { data: apptData } = await db
    .from("appointments")
    .select("id, user_id, status, start_time, end_time, provider_id, service_id")
    .eq("id", id)
    .single();

  const appt = apptData as Pick<
    AppointmentRow,
    "id" | "user_id" | "status" | "start_time" | "end_time" | "provider_id" | "service_id"
  > | null;

  if (!appt) {
    notFound();
  }

  // 4. Check ownership
  if (appt.user_id !== user.id) {
    notFound();
  }

  const t = await getTranslations("appointments");

  // 5. Check status is pending/confirmed AND > 24h away
  const nowMs = new Date().getTime();
  const isCancellableStatus = appt.status === "pending" || appt.status === "confirmed";
  const hoursUntilStart = (new Date(appt.start_time).getTime() - nowMs) / (1000 * 60 * 60);
  const canReschedule = isCancellableStatus && hoursUntilStart >= 24;

  if (!canReschedule) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="mb-6 text-2xl font-bold">{t("reschedulePage.title")}</h1>
        <p className="text-muted-foreground mb-4">{t("reschedulePage.cannotReschedule")}</p>
        <Link href={`/${locale}/appointments`} className={buttonVariants({ variant: "outline" })}>
          {t("reschedulePage.backToAppointments")}
        </Link>
      </div>
    );
  }

  const tBooking = await getTranslations("booking");

  // Fetch provider and service in parallel
  const [provider, serviceResult] = await Promise.all([
    getProviderById(supabase, appt.provider_id),
    db.from("services").select("id, name, duration_minutes, price_cents").eq("id", appt.service_id).single(),
  ]);

  if (!provider) {
    notFound();
  }

  const service = serviceResult.data as {
    id: string;
    name: string;
    duration_minutes: number;
    price_cents: number;
  } | null;

  if (!service) {
    notFound();
  }

  // 6. Compute available slots for next 14 days
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const futureDates: Date[] = [];
  for (let i = 0; i < 14; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    futureDates.push(d);
  }

  const rangeEnd = new Date(today);
  rangeEnd.setDate(today.getDate() + 14);
  const allBlocks = await getProviderBlocksForDateRange(supabase, appt.provider_id, today, rangeEnd);

  const slotsByDate: Record<string, Array<{ startTime: string; endTime: string }>> = {};

  for (const date of futureDates) {
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    const dayBlocks: BlockInterval[] = allBlocks.filter((b) => {
      const bStart = new Date(b.start_time);
      const bEnd = new Date(b.end_time);
      return bStart < dayEnd && bEnd > dayStart;
    });

    const existingAppointments = await getAppointmentsForDate(supabase, appt.provider_id, date);

    // 7. Exclude the current appointment so its old slot becomes available again
    const filteredAppointments = existingAppointments.filter((a) => a.id !== appt.id);

    const slots = computeAvailableSlots(
      date,
      provider.availability,
      filteredAppointments,
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

  // Current appointment display
  const currentStart = new Date(appt.start_time);
  const currentDateStr = currentStart.toLocaleDateString(locale === "de" ? "de-DE" : "en-GB", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const currentTimeStr = currentStart.toLocaleTimeString(locale === "de" ? "de-DE" : "en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-4">
        <Link
          href={`/${locale}/appointments`}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          ← {t("reschedulePage.backToAppointments")}
        </Link>
      </div>

      <h1 className="mb-6 text-2xl font-bold">{t("reschedulePage.title")}</h1>

      {/* Current appointment summary */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-base">{t("reschedulePage.currentAppointment")}</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
            <dt className="text-muted-foreground">{t("fields.service")}</dt>
            <dd className="font-medium">{service.name}</dd>
            <dt className="text-muted-foreground">{t("fields.date")}</dt>
            <dd>{currentDateStr}</dd>
            <dt className="text-muted-foreground">{t("fields.time")}</dt>
            <dd>{currentTimeStr}</dd>
          </dl>
        </CardContent>
      </Card>

      {/* New time picker */}
      <h2 className="mb-4 text-lg font-semibold">{t("reschedulePage.newTime")}</h2>
      <ReschedulePicker
        appointmentId={appt.id}
        dates={dates}
        slotsByDate={slotsByDate}
        locale={locale}
        rescheduleAction={rescheduleAction}
        labels={{
          noSlots: tBooking("noSlotsAvailable"),
          confirmButton: t("reschedulePage.confirmButton"),
          selectSlotFirst: t("reschedulePage.selectSlotFirst"),
          errorMessages: {
            notFound: t("reschedulePage.errors.notFound"),
            unauthorized: t("reschedulePage.errors.unauthorized"),
            cannotReschedule: t("reschedulePage.errors.cannotReschedule"),
            rescheduleTooLate: t("reschedulePage.errors.rescheduleTooLate"),
            invalidSlot: t("reschedulePage.errors.invalidSlot"),
            slotUnavailable: t("reschedulePage.errors.slotUnavailable"),
            unknown: t("reschedulePage.errors.unknown"),
          },
          successMessage: t("reschedulePage.successMessage"),
        }}
      />
    </div>
  );
}
