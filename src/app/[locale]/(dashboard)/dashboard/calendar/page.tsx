import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentProvider, getProviderAppointmentsRange } from "@/lib/supabase/queries";
import type { AppointmentWithProviderAndService } from "@/lib/supabase/queries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ProviderNoteEditor } from "@/components/features/ProviderNoteEditor";
import {
  confirmAppointment as confirmAppointmentAction,
  cancelAppointmentAsProvider as cancelAppointmentAsProviderAction,
  markNoShow as markNoShowAction,
  markCompleted as markCompletedAction,
} from "../../actions";

async function confirmAppointment(formData: FormData): Promise<void> {
  "use server";
  await confirmAppointmentAction(formData);
}

async function cancelAppointmentAsProvider(formData: FormData): Promise<void> {
  "use server";
  await cancelAppointmentAsProviderAction(formData);
}

async function markNoShow(formData: FormData): Promise<void> {
  "use server";
  await markNoShowAction(formData);
}

async function markCompleted(formData: FormData): Promise<void> {
  "use server";
  await markCompletedAction(formData);
}

interface CalendarPageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ view?: string }>;
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

function formatTime(dateStr: string, locale: string): string {
  return new Date(dateStr).toLocaleTimeString(locale === "de" ? "de-DE" : "en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDayHeading(date: Date, locale: string): string {
  return date.toLocaleDateString(locale === "de" ? "de-DE" : "en-GB", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function isoDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

interface AppointmentRowCardProps {
  appt: AppointmentWithProviderAndService;
  locale: string;
  customerLabel: string;
  serviceLabel: string;
  timeLabel: string;
  statusLabel: string;
  confirmButtonLabel: string;
  cancelButtonLabel: string;
  noShowButtonLabel: string;
  completeButtonLabel: string;
  confirmActionLabel: string;
  cancelActionLabel: string;
  isPastView: boolean;
  noteEditor: React.ReactNode;
}

function AppointmentRowCard({
  appt,
  locale,
  customerLabel,
  serviceLabel,
  timeLabel,
  statusLabel,
  confirmButtonLabel,
  cancelButtonLabel,
  noShowButtonLabel,
  completeButtonLabel,
  confirmActionLabel,
  cancelActionLabel,
  isPastView,
  noteEditor,
}: AppointmentRowCardProps) {
  const apptStart = new Date(appt.start_time);
  const isPast = apptStart < new Date();
  const canConfirm = !isPastView && appt.status === "pending";
  const canCancel = !isPastView && (appt.status === "pending" || appt.status === "confirmed");
  const canNoShow =
    !isPastView && isPast && (appt.status === "pending" || appt.status === "confirmed");
  const canComplete = !isPastView && isPast && appt.status === "confirmed";

  return (
    <div className="flex flex-col gap-3 rounded-lg border bg-card p-4">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium">{appt.serviceName}</span>
            <Badge className={getStatusClassName(appt.status)} variant="outline">
              {statusLabel}
            </Badge>
          </div>
          <dl className="grid grid-cols-[auto,1fr] gap-x-3 gap-y-0.5 text-sm text-muted-foreground">
            <dt>{customerLabel}:</dt>
            <dd className="text-foreground">{appt.providerName || "—"}</dd>
            <dt>{serviceLabel}:</dt>
            <dd className="text-foreground">{appt.serviceName}</dd>
            <dt>{timeLabel}:</dt>
            <dd className="text-foreground">{formatTime(appt.start_time, locale)}</dd>
          </dl>
          {appt.notes && (
            <p className="mt-2 text-sm text-muted-foreground italic">
              &ldquo;{appt.notes}&rdquo;
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {canConfirm && (
            <form action={confirmAppointment}>
              <input type="hidden" name="appointmentId" value={appt.id} />
              <input type="hidden" name="locale" value={locale} />
              <Button type="submit" size="sm" variant="default">
                {confirmButtonLabel}
              </Button>
            </form>
          )}
          {canCancel && (
            <form action={cancelAppointmentAsProvider}>
              <input type="hidden" name="appointmentId" value={appt.id} />
              <input type="hidden" name="locale" value={locale} />
              <Button
                type="submit"
                size="sm"
                variant="outline"
                className="text-destructive hover:text-destructive border-destructive/30 hover:bg-destructive/5"
                onClick={(e) => {
                  if (!confirm(cancelActionLabel)) {
                    e.preventDefault();
                  }
                }}
              >
                {cancelButtonLabel}
              </Button>
            </form>
          )}
          {canNoShow && (
            <form action={markNoShow}>
              <input type="hidden" name="appointmentId" value={appt.id} />
              <input type="hidden" name="locale" value={locale} />
              <Button
                type="submit"
                size="sm"
                variant="outline"
                onClick={(e) => {
                  if (!confirm(confirmActionLabel)) {
                    e.preventDefault();
                  }
                }}
              >
                {noShowButtonLabel}
              </Button>
            </form>
          )}
          {canComplete && (
            <form action={markCompleted}>
              <input type="hidden" name="appointmentId" value={appt.id} />
              <input type="hidden" name="locale" value={locale} />
              <Button type="submit" size="sm" variant="default">
                {completeButtonLabel}
              </Button>
            </form>
          )}
        </div>
      </div>

      {noteEditor}
    </div>
  );
}

export default async function CalendarPage({ params, searchParams }: CalendarPageProps) {
  const { locale } = await params;
  const { view } = await searchParams;

  // Whitelist the view param
  const isPastView = view === "past";

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

  let from: Date;
  let to: Date;

  if (isPastView) {
    // Last 30 days (up to but not including today midnight)
    from = new Date(now);
    from.setDate(now.getDate() - 30);
    from.setHours(0, 0, 0, 0);
    to = new Date(now);
    to.setHours(0, 0, 0, 0);
    to.setMilliseconds(-1);
  } else {
    // Today + next 7 days
    from = new Date(now);
    from.setHours(0, 0, 0, 0);
    to = new Date(from);
    to.setDate(from.getDate() + 7);
    to.setHours(23, 59, 59, 999);
  }

  const [appointments, t] = await Promise.all([
    getProviderAppointmentsRange(supabase, provider.id, from, to),
    getTranslations("calendar"),
  ]);

  // Group by date key
  const grouped = new Map<string, AppointmentWithProviderAndService[]>();

  if (isPastView) {
    // Past: iterate backwards (most recent first)
    for (let d = new Date(to); d >= from; d.setDate(d.getDate() - 1)) {
      grouped.set(isoDateKey(new Date(d)), []);
    }
  } else {
    for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
      grouped.set(isoDateKey(new Date(d)), []);
    }
  }

  for (const appt of appointments) {
    const key = isoDateKey(new Date(appt.start_time));
    const bucket = grouped.get(key);
    if (bucket) {
      bucket.push(appt);
    }
  }

  // For past view, skip empty days to reduce noise
  const days = Array.from(grouped.entries()).filter(
    ([, appts]) => !isPastView || appts.length > 0
  );

  return (
    <div>
      <h1 className="text-2xl font-bold">{t("title")}</h1>
      <p className="mt-1 text-muted-foreground">{provider.business_name}</p>

      {/* Tab navigation */}
      <div className="mt-4 flex gap-2 border-b pb-0">
        <Link
          href={`/${locale}/dashboard/calendar`}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            !isPastView
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          {t("today")}
        </Link>
        <Link
          href={`/${locale}/dashboard/calendar?view=past`}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            isPastView
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          {t("past30Days")}
        </Link>
      </div>

      <div className="mt-6 flex flex-col gap-8">
        {days.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("noAppointments")}</p>
        ) : (
          days.map(([dateKey, dayAppts]) => {
            const dayDate = new Date(dateKey + "T00:00:00");
            return (
              <section key={dateKey}>
                <h2 className="text-base font-semibold mb-3">
                  {formatDayHeading(dayDate, locale)}
                </h2>
                <Separator className="mb-3" />
                {dayAppts.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t("noAppointments")}</p>
                ) : (
                  <div className="flex flex-col gap-3">
                    {dayAppts.map((appt) => (
                      <AppointmentRowCard
                        key={appt.id}
                        appt={appt}
                        locale={locale}
                        customerLabel={t("customerLabel")}
                        serviceLabel={t("serviceLabel")}
                        timeLabel={t("timeLabel")}
                        statusLabel={t(`status.${appt.status}`)}
                        confirmButtonLabel={t("confirmButton")}
                        cancelButtonLabel={t("cancelButton")}
                        noShowButtonLabel={t("noShowButton")}
                        completeButtonLabel={t("completeButton")}
                        confirmActionLabel={t("noShowSuccess")}
                        cancelActionLabel={t("cancelSuccess")}
                        isPastView={isPastView}
                        noteEditor={
                          <ProviderNoteEditor
                            appointmentId={appt.id}
                            initialNote={appt.provider_notes ?? null}
                            locale={locale}
                          />
                        }
                      />
                    ))}
                  </div>
                )}
              </section>
            );
          })
        )}
      </div>
    </div>
  );
}
