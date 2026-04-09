import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendAppointmentReminder, sendReviewRequest } from "@/lib/email";

// Only callable by Vercel Cron (secret header). In development, CRON_SECRET may be unset.
export async function GET(request: NextRequest): Promise<NextResponse> {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  const isDev = process.env.NODE_ENV !== "production";

  // In production, CRON_SECRET must be set and must match — no bypass
  if (!isDev && !cronSecret) {
    console.error("[cron/send-reminders] CRON_SECRET not configured in production");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();

  // Find appointments starting in 23-25 hours that haven't had reminders sent
  const now = new Date();
  const from = new Date(now.getTime() + 23 * 60 * 60 * 1000);
  const to = new Date(now.getTime() + 25 * 60 * 60 * 1000);

  const { data: appointments, error } = (await supabase
    .from("appointments")
    .select("id, user_id, provider_id, service_id, start_time, status")
    .in("status", ["pending", "confirmed"])
    .gte("start_time", from.toISOString())
    .lte("start_time", to.toISOString())
    .is("reminder_24h_sent_at", null)) as unknown as {
    data: Array<{
      id: string;
      user_id: string;
      provider_id: string;
      service_id: string;
      start_time: string;
      status: string;
    }> | null;
    error: { message: string } | null;
  };

  if (error) {
    console.error("[cron/send-reminders] DB error:", error);
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }

  let sent = 0;
  let failed = 0;

  for (const appt of appointments ?? []) {
    // Fetch customer email + name, provider details, service name in parallel
    const [customerResult, providerResult, serviceResult] = await Promise.allSettled([
      (supabase
        .from("profiles")
        .select("email, full_name")
        .eq("id", appt.user_id)
        .single()) as unknown as Promise<{
        data: { email: string; full_name: string | null } | null;
      }>,
      (supabase
        .from("providers")
        .select("business_name, address, city")
        .eq("id", appt.provider_id)
        .single()) as unknown as Promise<{
        data: { business_name: string; address: string; city: string } | null;
      }>,
      (supabase
        .from("services")
        .select("name")
        .eq("id", appt.service_id)
        .single()) as unknown as Promise<{
        data: { name: string } | null;
      }>,
    ]);

    const customer = customerResult.status === "fulfilled" ? customerResult.value.data : null;
    const provider = providerResult.status === "fulfilled" ? providerResult.value.data : null;
    const service = serviceResult.status === "fulfilled" ? serviceResult.value.data : null;

    if (!customer?.email || !provider?.business_name) {
      failed++;
      continue;
    }

    await sendAppointmentReminder(customer.email, {
      appointmentId: appt.id,
      businessName: provider.business_name,
      serviceName: service?.name ?? "Termin",
      startTime: appt.start_time,
      address:
        provider.address && provider.city
          ? `${provider.address}, ${provider.city}`
          : provider.address ?? null,
      customerName: customer.full_name ?? null,
    });

    // Mark reminder as sent
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from("appointments")
      .update({ reminder_24h_sent_at: new Date().toISOString() })
      .eq("id", appt.id);

    sent++;
  }

  console.log(`[cron/send-reminders] sent=${sent} failed=${failed}`);

  // ── Review request emails ──────────────────────────────────────────────────
  // Find appointments that completed 24–48 h ago, have no review yet,
  // and haven't had a review request sent.
  const reviewFrom = new Date(now.getTime() - 48 * 60 * 60 * 1000);
  const reviewTo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const { data: completedAppts } = (await supabase
    .from("appointments")
    .select("id, user_id, provider_id, service_id, start_time")
    .eq("status", "completed")
    .gte("start_time", reviewFrom.toISOString())
    .lte("start_time", reviewTo.toISOString())
    .is("review_requested_at", null)) as unknown as {
    data: Array<{
      id: string;
      user_id: string;
      provider_id: string;
      service_id: string;
      start_time: string;
    }> | null;
  };

  let reviewsSent = 0;

  for (const appt of completedAppts ?? []) {
    // Check if a review already exists
    const { data: existing } = await supabase
      .from("reviews")
      .select("id")
      .eq("appointment_id", appt.id)
      .maybeSingle();

    if (existing) {
      // Mark as requested so we don't check again
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from("appointments")
        .update({ review_requested_at: new Date().toISOString() })
        .eq("id", appt.id);
      continue;
    }

    const [customerResult, providerResult, serviceResult] = await Promise.allSettled([
      supabase.from("profiles").select("email, full_name").eq("id", appt.user_id).single(),
      supabase.from("providers").select("business_name").eq("id", appt.provider_id).single(),
      supabase.from("services").select("name").eq("id", appt.service_id).single(),
    ]);

    const customerEmail =
      customerResult.status === "fulfilled"
        ? (customerResult.value.data as { email?: string } | null)?.email ?? null
        : null;
    const businessName =
      providerResult.status === "fulfilled"
        ? (providerResult.value.data as { business_name?: string } | null)?.business_name ?? ""
        : "";
    const serviceName =
      serviceResult.status === "fulfilled"
        ? (serviceResult.value.data as { name?: string } | null)?.name ?? ""
        : "";

    if (customerEmail) {
      await sendReviewRequest(customerEmail, {
        appointmentId: appt.id,
        businessName,
        serviceName,
        startTime: appt.start_time,
      });
      reviewsSent++;
    }

    // Mark as requested regardless of email success to prevent future retries
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from("appointments")
      .update({ review_requested_at: new Date().toISOString() })
      .eq("id", appt.id);
  }

  console.log(`[cron/send-reminders] sent=${sent} failed=${failed} reviewRequests=${reviewsSent}`);
  return NextResponse.json({ sent, failed, reviewsSent });
}
