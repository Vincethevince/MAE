import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getLastWeekRange, computeProviderWeeklyStats } from "@/lib/weekly-summary-stats";
import { sendProviderWeeklySummary } from "@/lib/email";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://makeappointmentseasier.com";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  const isDev = process.env.NODE_ENV !== "production";

  if (!isDev && !cronSecret) {
    console.error("[cron/send-weekly-summary] CRON_SECRET not configured in production");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const now = new Date();
  const range = getLastWeekRange(now);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: providers, error } = (await (supabase as any)
    .from("providers")
    .select("id, profile_id, business_name")
    .eq("weekly_summary_opt_in", true)
    .eq("is_active", true)) as unknown as {
    data: Array<{ id: string; profile_id: string; business_name: string }> | null;
    error: { message: string } | null;
  };

  if (error) {
    console.error("[cron/send-weekly-summary] DB error:", error);
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }

  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (const provider of providers ?? []) {
    try {
      const stats = await computeProviderWeeklyStats(supabase, provider.id, range);

      if (stats.bookingCount === 0) {
        skipped++;
        continue;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const profileResult = await (supabase as any)
        .from("profiles")
        .select("email")
        .eq("id", provider.profile_id)
        .single();

      const email: string | null = profileResult.data?.email ?? null;
      if (!email) {
        failed++;
        continue;
      }

      await sendProviderWeeklySummary(email, {
        businessName: provider.business_name,
        weekStart: range.start,
        weekEnd: range.end,
        bookingCount: stats.bookingCount,
        completedCount: stats.completedCount,
        revenueCents: stats.revenueCents,
        reviewCount: stats.reviewCount,
        averageRating: stats.averageRating,
        noShowCount: stats.noShowCount,
        topServiceName: stats.topServiceName,
        settingsUrl: `${APP_URL}/de/dashboard/settings`,
        dashboardUrl: `${APP_URL}/de/dashboard`,
      });

      sent++;
    } catch (err) {
      console.error(`[cron/send-weekly-summary] failed for provider ${provider.id}:`, err);
      failed++;
    }
  }

  console.log(`[cron/send-weekly-summary] sent=${sent} skipped=${skipped} failed=${failed}`);
  return NextResponse.json({ sent, skipped, failed });
}
