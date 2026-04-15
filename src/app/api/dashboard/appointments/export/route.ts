import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const EXPORT_LIMIT = 1000;

/**
 * Sanitize a CSV cell value:
 * - Wrap in double quotes (handles commas and newlines inside values)
 * - Escape embedded double quotes by doubling them
 * - Prevent CSV injection: prefix values that start with =, +, -, @, |, \t, \r
 *   with a single tab character so spreadsheet apps don't evaluate them as formulas
 */
function csvCell(value: string | null | undefined): string {
  const str = value == null ? "" : String(value);
  // CSV injection guard: prefix formula-starting characters
  const safe = /^[=+\-@|]/.test(str) ? `\t${str}` : str;
  // Quote and escape
  return `"${safe.replace(/"/g, '""')}"`;
}

function buildCsv(
  appointments: Array<{
    id: string;
    start_time: string;
    end_time: string;
    status: string;
    price_cents: number | null;
    service_name: string | null;
    customer_name: string | null;
    customer_phone: string | null;
    notes: string | null;
  }>
): string {
  const header = [
    "Datum",
    "Uhrzeit (von)",
    "Uhrzeit (bis)",
    "Status",
    "Leistung",
    "Kunde",
    "Telefon",
    "Preis (€)",
    "Notiz",
    "ID",
  ].map(csvCell).join(",");

  const rows = appointments.map((a) => {
    const start = new Date(a.start_time);
    const end = new Date(a.end_time);

    const dateStr = start.toLocaleDateString("de-DE", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      timeZone: "Europe/Berlin",
    });
    const startTimeStr = start.toLocaleTimeString("de-DE", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Europe/Berlin",
    });
    const endTimeStr = end.toLocaleTimeString("de-DE", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Europe/Berlin",
    });

    const priceEur =
      a.price_cents != null ? (a.price_cents / 100).toFixed(2).replace(".", ",") : "";

    return [
      csvCell(dateStr),
      csvCell(startTimeStr),
      csvCell(endTimeStr),
      csvCell(a.status),
      csvCell(a.service_name),
      csvCell(a.customer_name),
      csvCell(a.customer_phone),
      csvCell(priceEur),
      csvCell(a.notes),
      csvCell(a.id),
    ].join(",");
  });

  return [header, ...rows].join("\r\n");
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  // Optional year filter from query param (e.g. ?year=2025)
  const rawYear = request.nextUrl.searchParams.get("year");
  const filterYear = rawYear ? parseInt(rawYear, 10) : NaN;

  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;

  // Look up the provider record for this user
  const { data: providerData } = await db
    .from("providers")
    .select("id")
    .eq("profile_id", user.id)
    .single();

  if (!providerData) {
    return NextResponse.json({ error: "Not a provider" }, { status: 403 });
  }

  const providerId = (providerData as { id: string }).id;

  // Build the query — optionally filtered by year
  let query = db
    .from("appointments")
    .select("id, start_time, end_time, status, price_cents, service_id, user_id, notes")
    .eq("provider_id", providerId)
    .order("start_time", { ascending: false })
    .limit(EXPORT_LIMIT);

  if (!isNaN(filterYear) && filterYear >= 2020 && filterYear <= 2100) {
    query = query
      .gte("start_time", `${filterYear}-01-01T00:00:00.000Z`)
      .lt("start_time", `${filterYear + 1}-01-01T00:00:00.000Z`);
  }

  const { data: appointments, error: apptError } = await query;

  if (apptError) {
    console.error("[export] DB error:", apptError);
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }

  const appts = (appointments ?? []) as Array<{
    id: string;
    start_time: string;
    end_time: string;
    status: string;
    price_cents: number | null;
    service_id: string;
    user_id: string | null;
    notes: string | null;
  }>;

  if (appts.length === 0) {
    const csv = buildCsv([]);
    const filename = encodeURIComponent(`mae-termine.csv`);
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  }

  // Batch-fetch services and profiles
  const serviceIds = [...new Set(appts.map((a) => a.service_id))];
  const userIds = [...new Set(appts.map((a) => a.user_id).filter(Boolean))] as string[];

  const [{ data: services }, { data: profiles }] = await Promise.all([
    db.from("services").select("id, name").in("id", serviceIds),
    userIds.length > 0
      ? db.from("profiles").select("id, full_name, phone").in("id", userIds)
      : Promise.resolve({ data: [] }),
  ]);

  const serviceMap = new Map<string, string>();
  if (services) {
    for (const s of services as { id: string; name: string }[]) {
      serviceMap.set(s.id, s.name);
    }
  }

  const profileMap = new Map<string, { name: string | null; phone: string | null }>();
  if (profiles) {
    for (const p of profiles as { id: string; full_name: string | null; phone: string | null }[]) {
      profileMap.set(p.id, { name: p.full_name, phone: p.phone });
    }
  }

  const rows = appts.map((a) => ({
    id: a.id,
    start_time: a.start_time,
    end_time: a.end_time,
    status: a.status,
    price_cents: a.price_cents,
    notes: a.notes,
    service_name: serviceMap.get(a.service_id) ?? null,
    customer_name: a.user_id ? (profileMap.get(a.user_id)?.name ?? null) : null,
    customer_phone: a.user_id ? (profileMap.get(a.user_id)?.phone ?? null) : null,
  }));

  const csv = buildCsv(rows);
  const today = new Date().toISOString().slice(0, 10);
  const filename = encodeURIComponent(`mae-termine-${today}.csv`);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
