import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  buildExportFilename,
  buildExportPayload,
  type AppointmentExportRow,
  type ReviewExportRow,
  type SavedProviderExportRow,
  type ProviderDataExport,
} from "@/lib/export-data";

// TODO: add rate limiting (e.g. 3 exports per user per hour) before launch

export async function POST(request: NextRequest): Promise<NextResponse> {
  // Parse body
  let password: string;
  try {
    const body = await request.json();
    password = typeof body?.password === "string" ? body.password : "";
  } catch {
    return NextResponse.json({ error: "badRequest" }, { status: 400 });
  }

  if (!password || password.length > 128) {
    return NextResponse.json({ error: "badRequest" }, { status: 400 });
  }

  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user || !user.email) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // Re-authenticate before exporting — prevents session-hijacking attacks
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password,
  });
  if (signInError) {
    return NextResponse.json({ error: "currentPasswordWrong" }, { status: 401 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;

  // Fetch profile
  const { data: profileData } = await db
    .from("profiles")
    .select("id, email, full_name, phone, role, created_at, updated_at")
    .eq("id", user.id)
    .single();

  const profile = profileData as {
    id: string;
    email: string;
    full_name: string | null;
    phone: string | null;
    role: string;
    created_at: string;
    updated_at: string;
  } | null;

  // Fetch appointments as customer
  const { data: rawAppointments } = await db
    .from("appointments")
    .select(
      "id, start_time, end_time, status, price_cents, notes, service_id, provider_id, created_at, updated_at"
    )
    .eq("user_id", user.id)
    .order("start_time", { ascending: false });

  const rawAppts = (rawAppointments ?? []) as Array<{
    id: string;
    start_time: string;
    end_time: string;
    status: string;
    price_cents: number | null;
    notes: string | null;
    service_id: string;
    provider_id: string;
    created_at: string;
    updated_at: string;
  }>;

  // Enrich appointments with service name and provider business name
  let appointments: AppointmentExportRow[] = [];
  if (rawAppts.length > 0) {
    const serviceIds = [...new Set(rawAppts.map((a) => a.service_id))];
    const providerIds = [...new Set(rawAppts.map((a) => a.provider_id))];

    const [{ data: services }, { data: providers }] = await Promise.all([
      db.from("services").select("id, name").in("id", serviceIds),
      db.from("providers").select("id, business_name").in("id", providerIds),
    ]);

    const serviceMap = new Map<string, string>();
    if (services) {
      for (const s of services as { id: string; name: string }[]) {
        serviceMap.set(s.id, s.name);
      }
    }
    const providerMap = new Map<string, string>();
    if (providers) {
      for (const p of providers as { id: string; business_name: string }[]) {
        providerMap.set(p.id, p.business_name);
      }
    }

    appointments = rawAppts.map((a) => ({
      id: a.id,
      start_time: a.start_time,
      end_time: a.end_time,
      status: a.status,
      price_cents: a.price_cents,
      notes: a.notes,
      created_at: a.created_at,
      updated_at: a.updated_at,
      service_name: serviceMap.get(a.service_id) ?? null,
      provider_business_name: providerMap.get(a.provider_id) ?? null,
    }));
  }

  // Fetch authored reviews
  const { data: rawReviews } = await db
    .from("reviews")
    .select("id, provider_id, appointment_id, rating, comment, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const reviews: ReviewExportRow[] = (rawReviews ?? []) as ReviewExportRow[];

  // Fetch saved providers (column is customer_id, not user_id — see migration 00010)
  const { data: rawSaved } = await db
    .from("saved_providers")
    .select("id, provider_id, created_at")
    .eq("customer_id", user.id)
    .order("created_at", { ascending: false });

  const savedProviders: SavedProviderExportRow[] = (rawSaved ?? []) as SavedProviderExportRow[];

  // Provider data — only if the user is also a provider
  let providerData: ProviderDataExport | null = null;

  const { data: providerRow } = await db
    .from("providers")
    .select(
      "id, business_name, description, address, city, postal_code, latitude, longitude, phone, website, category, rating, review_count, is_active, created_at, updated_at"
    )
    .eq("profile_id", user.id)
    .single();

  if (providerRow) {
    const providerId = (providerRow as { id: string }).id;

    const [
      { data: servicesData },
      { data: employeesData },
      { data: availabilityData },
      { data: blocksData },
    ] = await Promise.all([
      db.from("services").select("*").eq("provider_id", providerId),
      db.from("employees").select("*").eq("provider_id", providerId),
      db.from("availability").select("*").eq("provider_id", providerId),
      db.from("provider_blocks").select("*").eq("provider_id", providerId),
    ]);

    providerData = {
      provider: providerRow as Record<string, unknown>,
      services: (servicesData ?? []) as Record<string, unknown>[],
      employees: (employeesData ?? []) as Record<string, unknown>[],
      availability: (availabilityData ?? []) as Record<string, unknown>[],
      schedule_blocks: (blocksData ?? []) as Record<string, unknown>[],
      // Customer appointment data is omitted to prevent any PII leakage
      appointments_note:
        "Provider-side appointment records are not included in this export to protect the privacy of other customers.",
    };
  }

  const isoDate = new Date().toISOString().slice(0, 10);

  const payload = buildExportPayload({
    exportedAt: new Date().toISOString(),
    auth: {
      email: user.email,
      created_at: user.created_at ?? null,
      last_sign_in_at: user.last_sign_in_at ?? null,
    },
    profile,
    appointments,
    reviews,
    savedProviders,
    providerData,
  });

  const body = JSON.stringify(payload, null, 2);
  const filename = buildExportFilename(isoDate);

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
