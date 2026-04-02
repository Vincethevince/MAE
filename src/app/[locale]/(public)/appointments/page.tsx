import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { createClient } from "@/lib/supabase/server";
import { getUserAppointments } from "@/lib/supabase/queries";
import type { AppointmentWithProviderAndService } from "@/lib/supabase/queries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cancelAppointment as cancelAppointmentAction } from "./actions";

async function cancelAppointment(formData: FormData): Promise<void> {
  "use server";
  await cancelAppointmentAction(formData);
}

interface AppointmentsPageProps {
  params: Promise<{ locale: string }>;
}

type AppointmentStatus = AppointmentWithProviderAndService["status"];

function getStatusVariant(
  status: AppointmentStatus
): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "confirmed":
      return "default";
    case "pending":
      return "outline";
    case "cancelled":
      return "secondary";
    case "completed":
      return "default";
    case "no_show":
      return "destructive";
    default:
      return "secondary";
  }
}

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

function formatPrice(cents: number): string {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);
}

interface AppointmentCardProps {
  appt: AppointmentWithProviderAndService;
  locale: string;
  statusLabel: string;
  durationLabel: string;
  minutesLabel: string;
  priceLabel: string;
  cancelButtonLabel: string;
  cancelConfirmLabel: string;
  showCancel: boolean;
}

function AppointmentCard({
  appt,
  locale,
  statusLabel,
  durationLabel,
  minutesLabel,
  priceLabel,
  cancelButtonLabel,
  cancelConfirmLabel,
  showCancel,
}: AppointmentCardProps) {
  const startDate = new Date(appt.start_time);
  const dateStr = startDate.toLocaleDateString(locale === "de" ? "de-DE" : "en-GB", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const timeStr = startDate.toLocaleTimeString(locale === "de" ? "de-DE" : "en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base">{appt.serviceName}</CardTitle>
          <Badge
            variant={getStatusVariant(appt.status)}
            className={getStatusClassName(appt.status)}
          >
            {statusLabel}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">{appt.providerName}</p>
      </CardHeader>
      <CardContent>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
          <dt className="text-muted-foreground">{dateStr}</dt>
          <dd className="font-medium">{timeStr}</dd>
          <dt className="text-muted-foreground">{durationLabel}</dt>
          <dd>
            {appt.serviceDurationMinutes} {minutesLabel}
          </dd>
          <dt className="text-muted-foreground">{priceLabel}</dt>
          <dd>{formatPrice(appt.servicePriceCents)}</dd>
        </dl>

        {showCancel && (
          <form action={cancelAppointment} className="mt-4">
            <input type="hidden" name="appointmentId" value={appt.id} />
            <input type="hidden" name="locale" value={locale} />
            <Button
              type="submit"
              variant="outline"
              size="sm"
              className="text-destructive hover:text-destructive border-destructive/30 hover:bg-destructive/5"
              onClick={(e) => {
                if (!confirm(cancelConfirmLabel)) {
                  e.preventDefault();
                }
              }}
            >
              {cancelButtonLabel}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}

export default async function AppointmentsPage({ params }: AppointmentsPageProps) {
  const { locale } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/login`);
  }

  const [appointments, t] = await Promise.all([
    getUserAppointments(supabase, user.id),
    getTranslations("appointments"),
  ]);

  const upcomingStatuses = new Set(["pending", "confirmed"]);
  const pastStatuses = new Set(["completed", "cancelled", "no_show"]);

  const upcoming = appointments
    .filter((a) => upcomingStatuses.has(a.status))
    .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

  const past = appointments
    .filter((a) => pastStatuses.has(a.status))
    .sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime());

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">{t("title")}</h1>

      <section className="mb-10">
        <h2 className="mb-4 text-lg font-semibold">{t("upcoming")}</h2>
        {upcoming.length === 0 ? (
          <p className="text-muted-foreground text-sm">{t("emptyUpcoming")}</p>
        ) : (
          <div className="flex flex-col gap-4">
            {upcoming.map((appt) => (
              <AppointmentCard
                key={appt.id}
                appt={appt}
                locale={locale}
                statusLabel={t(`status.${appt.status}`)}
                durationLabel={t("fields.duration")}
                minutesLabel={t("fields.minutes")}
                priceLabel={t("fields.price")}
                cancelButtonLabel={t("cancelButton")}
                cancelConfirmLabel={t("cancelConfirm")}
                showCancel={appt.status === "pending" || appt.status === "confirmed"}
              />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold">{t("past")}</h2>
        {past.length === 0 ? (
          <p className="text-muted-foreground text-sm">{t("emptyPast")}</p>
        ) : (
          <div className="flex flex-col gap-4">
            {past.map((appt) => (
              <AppointmentCard
                key={appt.id}
                appt={appt}
                locale={locale}
                statusLabel={t(`status.${appt.status}`)}
                durationLabel={t("fields.duration")}
                minutesLabel={t("fields.minutes")}
                priceLabel={t("fields.price")}
                cancelButtonLabel={t("cancelButton")}
                cancelConfirmLabel={t("cancelConfirm")}
                showCancel={false}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
