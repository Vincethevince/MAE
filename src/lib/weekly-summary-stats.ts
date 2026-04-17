import type { SupabaseClient } from "@supabase/supabase-js";

export interface WeeklySummaryStats {
  bookingCount: number;
  completedCount: number;
  revenueCents: number;
  reviewCount: number;
  averageRating: number | null;
  noShowCount: number;
  topServiceName: string | null;
}

export function getLastWeekRange(now: Date): { start: Date; end: Date } {
  // ISO week starts on Monday (day 1). Convert Sunday (0) → 7 for easy math.
  const dayOfWeek = now.getUTCDay() === 0 ? 7 : now.getUTCDay();

  // Start of the current Monday (00:00 UTC)
  const currentMonday = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - (dayOfWeek - 1))
  );

  // Previous Monday = 7 days earlier
  const start = new Date(currentMonday.getTime() - 7 * 24 * 60 * 60 * 1000);

  // Previous Sunday = currentMonday - 1 second = 23:59:59 UTC of prev Sunday
  const end = new Date(currentMonday.getTime() - 1000);

  return { start, end };
}

export async function computeProviderWeeklyStats(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>,
  providerId: string,
  range: { start: Date; end: Date }
): Promise<WeeklySummaryStats> {
  const startIso = range.start.toISOString();
  const endIso = range.end.toISOString();

  const [appointmentsResult, reviewsResult] = await Promise.allSettled([
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from("appointments")
      .select("id, status, service_id")
      .eq("provider_id", providerId)
      .gte("start_time", startIso)
      .lte("start_time", endIso),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from("reviews")
      .select("rating")
      .eq("provider_id", providerId)
      .gte("created_at", startIso)
      .lte("created_at", endIso),
  ]);

  const appointments: Array<{ id: string; status: string; service_id: string }> =
    appointmentsResult.status === "fulfilled"
      ? (appointmentsResult.value.data ?? [])
      : [];

  const reviews: Array<{ rating: number }> =
    reviewsResult.status === "fulfilled" ? (reviewsResult.value.data ?? []) : [];

  const completedAppointments = appointments.filter((a) => a.status === "completed");
  const noShowCount = appointments.filter((a) => a.status === "no_show").length;

  // Fetch price_cents for completed appointments to compute revenue
  let revenueCents = 0;
  if (completedAppointments.length > 0) {
    const completedIds = completedAppointments.map((a) => a.id);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: priceData } = await (supabase as any)
      .from("appointments")
      .select("service_id, services(price_cents)")
      .in("id", completedIds);

    for (const row of priceData ?? []) {
      revenueCents += (row.services?.price_cents ?? 0) as number;
    }
  }

  // Top service by booking count among all appointments in the week
  let topServiceName: string | null = null;
  if (appointments.length > 0) {
    const serviceIds = appointments.map((a) => a.service_id);
    const countMap = new Map<string, number>();
    for (const id of serviceIds) {
      countMap.set(id, (countMap.get(id) ?? 0) + 1);
    }
    const topId = [...countMap.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
    if (topId) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: serviceData } = await (supabase as any)
        .from("services")
        .select("name")
        .eq("id", topId)
        .single();
      topServiceName = (serviceData?.name as string | null | undefined) ?? null;
    }
  }

  const reviewCount = reviews.length;
  const averageRating =
    reviewCount > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviewCount
      : null;

  return {
    bookingCount: appointments.length,
    completedCount: completedAppointments.length,
    revenueCents,
    reviewCount,
    averageRating,
    noShowCount,
    topServiceName,
  };
}
