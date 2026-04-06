import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";

type TypedSupabaseClient = SupabaseClient<Database>;
type ProviderRow = Database["public"]["Tables"]["providers"]["Row"];
type ServiceRow = Database["public"]["Tables"]["services"]["Row"];
type AvailabilityRow = Database["public"]["Tables"]["availability"]["Row"];
type EmployeeRow = Database["public"]["Tables"]["employees"]["Row"];
type ReviewRow = Database["public"]["Tables"]["reviews"]["Row"];
type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
type AppointmentRow = Database["public"]["Tables"]["appointments"]["Row"];

export interface AppointmentWithDetails extends AppointmentRow {
  provider: Pick<ProviderRow, "id" | "business_name" | "address" | "city">;
  service: Pick<ServiceRow, "id" | "name" | "duration_minutes" | "price_cents">;
}

export interface AppointmentWithProviderAndService extends AppointmentRow {
  providerName: string;
  serviceName: string;
  serviceDurationMinutes: number;
  servicePriceCents: number;
}

export interface ProviderSearchResult extends ProviderRow {
  min_price_cents: number | null;
}

export interface ProviderWithDetails extends ProviderRow {
  services: ServiceRow[];
  availability: AvailabilityRow[];
}

export interface ReviewWithUser extends ReviewRow {
  user_full_name: string | null;
}

interface SearchProvidersOptions {
  query?: string;
  city?: string;
  category?: string;
}

// supabase-js 2.100+ uses a newer internal schema format; cast to any for queries
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function db(supabase: TypedSupabaseClient): any {
  return supabase;
}

export async function getCurrentProvider(
  supabase: TypedSupabaseClient
): Promise<ProviderRow | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data } = await db(supabase)
    .from("providers")
    .select("*")
    .eq("profile_id", user.id)
    .eq("is_active", true)
    .single();

  return (data as ProviderRow | null) ?? null;
}

export async function getProviderServices(
  supabase: TypedSupabaseClient,
  providerId: string
): Promise<ServiceRow[]> {
  const { data } = await db(supabase)
    .from("services")
    .select("*")
    .eq("provider_id", providerId)
    .eq("is_active", true)
    .order("name");

  return (data as ServiceRow[] | null) ?? [];
}

export async function getProviderEmployees(
  supabase: TypedSupabaseClient,
  providerId: string
): Promise<EmployeeRow[]> {
  const { data } = await db(supabase)
    .from("employees")
    .select("*")
    .eq("provider_id", providerId)
    .eq("is_active", true)
    .order("name");

  return (data as EmployeeRow[] | null) ?? [];
}

export async function getEmployeeAvailability(
  supabase: TypedSupabaseClient,
  employeeId: string
): Promise<AvailabilityRow[]> {
  const { data } = await db(supabase)
    .from("availability")
    .select("*")
    .eq("employee_id", employeeId)
    .order("day_of_week");

  return (data as AvailabilityRow[] | null) ?? [];
}

export async function getProviderAvailability(
  supabase: TypedSupabaseClient,
  providerId: string
): Promise<AvailabilityRow[]> {
  const { data } = await db(supabase)
    .from("availability")
    .select("*")
    .eq("provider_id", providerId)
    .order("day_of_week");

  return (data as AvailabilityRow[] | null) ?? [];
}

export async function searchProviders(
  supabase: TypedSupabaseClient,
  { query, city, category }: SearchProvidersOptions
): Promise<ProviderSearchResult[]> {
  let q = db(supabase)
    .from("providers")
    .select("*")
    .eq("is_active", true);

  if (query) {
    q = q.ilike("business_name", `%${query}%`);
  }

  if (city) {
    q = q.ilike("city", `%${city}%`);
  }

  if (category) {
    q = q.ilike("category", `%${category}%`);
  }

  const { data: providers } = await q.order("rating", { ascending: false });

  if (!providers || providers.length === 0) {
    return [];
  }

  const providerIds = (providers as ProviderRow[]).map((p) => p.id);

  const { data: services } = await db(supabase)
    .from("services")
    .select("provider_id, price_cents")
    .in("provider_id", providerIds)
    .eq("is_active", true);

  const minPriceMap = new Map<string, number>();
  if (services) {
    for (const svc of services as { provider_id: string; price_cents: number }[]) {
      const current = minPriceMap.get(svc.provider_id);
      if (current === undefined || svc.price_cents < current) {
        minPriceMap.set(svc.provider_id, svc.price_cents);
      }
    }
  }

  return (providers as ProviderRow[]).map((p) => ({
    ...p,
    min_price_cents: minPriceMap.get(p.id) ?? null,
  }));
}

export async function getProviderById(
  supabase: TypedSupabaseClient,
  id: string
): Promise<ProviderWithDetails | null> {
  const { data: provider } = await db(supabase)
    .from("providers")
    .select("*")
    .eq("id", id)
    .eq("is_active", true)
    .single();

  if (!provider) return null;

  const [services, availability] = await Promise.all([
    getProviderServices(supabase, id),
    getProviderAvailability(supabase, id),
  ]);

  return {
    ...(provider as ProviderRow),
    services,
    availability,
  };
}

export async function getServiceById(
  supabase: TypedSupabaseClient,
  serviceId: string
): Promise<ServiceRow | null> {
  const { data } = await db(supabase)
    .from("services")
    .select("*")
    .eq("id", serviceId)
    .eq("is_active", true)
    .single();

  return (data as ServiceRow | null) ?? null;
}

export async function getAppointmentsForDate(
  supabase: TypedSupabaseClient,
  providerId: string,
  date: Date
): Promise<AppointmentRow[]> {
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(date);
  dayEnd.setHours(23, 59, 59, 999);

  const { data } = await db(supabase)
    .from("appointments")
    .select("*")
    .eq("provider_id", providerId)
    .neq("status", "cancelled")
    .gte("start_time", dayStart.toISOString())
    .lte("start_time", dayEnd.toISOString());

  return (data as AppointmentRow[] | null) ?? [];
}

export async function getAppointmentById(
  supabase: TypedSupabaseClient,
  appointmentId: string
): Promise<AppointmentWithDetails | null> {
  const { data: appt } = await db(supabase)
    .from("appointments")
    .select("*")
    .eq("id", appointmentId)
    .single();

  if (!appt) return null;

  const appointment = appt as AppointmentRow;

  const [{ data: providerData }, { data: serviceData }] = await Promise.all([
    db(supabase)
      .from("providers")
      .select("id, business_name, address, city")
      .eq("id", appointment.provider_id)
      .single(),
    db(supabase)
      .from("services")
      .select("id, name, duration_minutes, price_cents")
      .eq("id", appointment.service_id)
      .single(),
  ]);

  if (!providerData || !serviceData) return null;

  return {
    ...appointment,
    provider: providerData as Pick<ProviderRow, "id" | "business_name" | "address" | "city">,
    service: serviceData as Pick<ServiceRow, "id" | "name" | "duration_minutes" | "price_cents">,
  };
}

export async function getUserAppointments(
  supabase: TypedSupabaseClient,
  userId: string
): Promise<AppointmentWithProviderAndService[]> {
  const { data: appointments } = await db(supabase)
    .from("appointments")
    .select("*")
    .eq("user_id", userId)
    .order("start_time", { ascending: true });

  if (!appointments || appointments.length === 0) return [];

  const appts = appointments as AppointmentRow[];

  const providerIds = [...new Set(appts.map((a) => a.provider_id))];
  const serviceIds = [...new Set(appts.map((a) => a.service_id))];

  const [{ data: providers }, { data: services }] = await Promise.all([
    db(supabase)
      .from("providers")
      .select("id, business_name")
      .in("id", providerIds),
    db(supabase)
      .from("services")
      .select("id, name, duration_minutes, price_cents")
      .in("id", serviceIds),
  ]);

  const providerMap = new Map<string, string>();
  if (providers) {
    for (const p of providers as Pick<ProviderRow, "id" | "business_name">[]) {
      providerMap.set(p.id, p.business_name);
    }
  }

  type ServiceLookup = Pick<ServiceRow, "id" | "name" | "duration_minutes" | "price_cents">;
  const serviceMap = new Map<string, ServiceLookup>();
  if (services) {
    for (const s of services as ServiceLookup[]) {
      serviceMap.set(s.id, s);
    }
  }

  return appts.map((appt) => ({
    ...appt,
    providerName: providerMap.get(appt.provider_id) ?? "",
    serviceName: serviceMap.get(appt.service_id)?.name ?? "",
    serviceDurationMinutes: serviceMap.get(appt.service_id)?.duration_minutes ?? 0,
    servicePriceCents: serviceMap.get(appt.service_id)?.price_cents ?? 0,
  }));
}

export async function getProviderAppointmentsRange(
  supabase: TypedSupabaseClient,
  providerId: string,
  from: Date,
  to: Date
): Promise<AppointmentWithProviderAndService[]> {
  const { data: appointments } = await db(supabase)
    .from("appointments")
    .select("*")
    .eq("provider_id", providerId)
    .gte("start_time", from.toISOString())
    .lte("start_time", to.toISOString())
    .order("start_time", { ascending: true });

  if (!appointments || appointments.length === 0) return [];

  const appts = appointments as AppointmentRow[];

  const userIds = [...new Set(appts.map((a) => a.user_id))];
  const serviceIds = [...new Set(appts.map((a) => a.service_id))];

  const [{ data: profiles }, { data: services }] = await Promise.all([
    db(supabase)
      .from("public_profiles")
      .select("id, full_name")
      .in("id", userIds),
    db(supabase)
      .from("services")
      .select("id, name, duration_minutes, price_cents")
      .in("id", serviceIds),
  ]);

  const profileMap = new Map<string, string | null>();
  if (profiles) {
    for (const p of profiles as Pick<ProfileRow, "id" | "full_name">[]) {
      profileMap.set(p.id, p.full_name);
    }
  }

  type ServiceLookup = Pick<ServiceRow, "id" | "name" | "duration_minutes" | "price_cents">;
  const serviceMap = new Map<string, ServiceLookup>();
  if (services) {
    for (const s of services as ServiceLookup[]) {
      serviceMap.set(s.id, s);
    }
  }

  return appts.map((appt) => ({
    ...appt,
    providerName: profileMap.get(appt.user_id) ?? "",
    serviceName: serviceMap.get(appt.service_id)?.name ?? "",
    serviceDurationMinutes: serviceMap.get(appt.service_id)?.duration_minutes ?? 0,
    servicePriceCents: serviceMap.get(appt.service_id)?.price_cents ?? 0,
  }));
}

export interface TimeSlotSearchOptions {
  date: Date;
  startTime: string; // "HH:MM" — user's available window start
  endTime: string;   // "HH:MM" — user's available window end
  city?: string;
  category?: string;
}

// TODO: This runs N queries for N providers. Acceptable for MVP with small
// provider counts. Refactor to a single SQL/RPC call when scaling.
export async function searchProvidersByTimeSlot(
  supabase: TypedSupabaseClient,
  options: TimeSlotSearchOptions
): Promise<ProviderSearchResult[]> {
  const { computeAvailableSlots } = await import("@/lib/booking");

  // 1. Get all active providers, optionally filtered by city/category
  let q = db(supabase)
    .from("providers")
    .select("*")
    .eq("is_active", true);

  if (options.city) {
    q = q.ilike("city", `%${options.city}%`);
  }
  if (options.category) {
    q = q.ilike("category", `%${options.category}%`);
  }

  const { data: providers } = await q.order("rating", { ascending: false });

  if (!providers || providers.length === 0) return [];

  const allProviders = providers as ProviderRow[];
  const providerIds = allProviders.map((p) => p.id);

  // 2. Fetch all active services for these providers in one query
  const { data: allServices } = await db(supabase)
    .from("services")
    .select("provider_id, duration_minutes, price_cents")
    .in("provider_id", providerIds)
    .eq("is_active", true);

  type ServiceLookup = { provider_id: string; duration_minutes: number; price_cents: number };

  const servicesByProvider = new Map<string, ServiceLookup[]>();
  const minPriceMap = new Map<string, number>();

  if (allServices) {
    for (const svc of allServices as ServiceLookup[]) {
      const existing = servicesByProvider.get(svc.provider_id) ?? [];
      existing.push(svc);
      servicesByProvider.set(svc.provider_id, existing);

      const currentMin = minPriceMap.get(svc.provider_id);
      if (currentMin === undefined || svc.price_cents < currentMin) {
        minPriceMap.set(svc.provider_id, svc.price_cents);
      }
    }
  }

  // 3. Fetch availability for all providers in one query
  const { data: allAvailability } = await db(supabase)
    .from("availability")
    .select("*")
    .in("provider_id", providerIds);

  const availabilityByProvider = new Map<string, AvailabilityRow[]>();
  if (allAvailability) {
    for (const row of allAvailability as AvailabilityRow[]) {
      const existing = availabilityByProvider.get(row.provider_id) ?? [];
      existing.push(row);
      availabilityByProvider.set(row.provider_id, existing);
    }
  }

  // 4. Fetch existing appointments for all providers on this date in one query
  const dayStart = new Date(options.date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(options.date);
  dayEnd.setHours(23, 59, 59, 999);

  const { data: allAppointments } = await db(supabase)
    .from("appointments")
    .select("*")
    .in("provider_id", providerIds)
    .neq("status", "cancelled")
    .gte("start_time", dayStart.toISOString())
    .lte("start_time", dayEnd.toISOString());

  const appointmentsByProvider = new Map<string, AppointmentRow[]>();
  if (allAppointments) {
    for (const appt of allAppointments as AppointmentRow[]) {
      const existing = appointmentsByProvider.get(appt.provider_id) ?? [];
      existing.push(appt);
      appointmentsByProvider.set(appt.provider_id, existing);
    }
  }

  // 5. Parse user's requested window as Date objects on options.date
  function parseWindowTime(timeStr: string): Date {
    const [h, m] = timeStr.split(":").map((s) => parseInt(s, 10));
    const d = new Date(options.date);
    d.setHours(h ?? 0, m ?? 0, 0, 0);
    return d;
  }

  const windowStart = parseWindowTime(options.startTime);
  const windowEnd = parseWindowTime(options.endTime);

  // 6. Filter providers that have at least one slot fitting in the window
  const matchingProviders: ProviderSearchResult[] = [];

  for (const provider of allProviders) {
    const services = servicesByProvider.get(provider.id);
    if (!services || services.length === 0) continue;

    // Use the shortest service duration for slot generation
    const minDuration = Math.min(...services.map((s) => s.duration_minutes));

    const availability = availabilityByProvider.get(provider.id) ?? [];
    const appointments = appointmentsByProvider.get(provider.id) ?? [];

    const slots = computeAvailableSlots(
      options.date,
      availability,
      appointments,
      minDuration
    );

    // A slot fits if it starts >= windowStart AND ends <= windowEnd
    const hasMatch = slots.some(
      (slot) => slot.startTime >= windowStart && slot.endTime <= windowEnd
    );

    if (hasMatch) {
      matchingProviders.push({
        ...provider,
        min_price_cents: minPriceMap.get(provider.id) ?? null,
      });
    }
  }

  return matchingProviders;
}

export async function getProviderRevenue30Days(
  supabase: TypedSupabaseClient,
  providerId: string
): Promise<number> {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  thirtyDaysAgo.setHours(0, 0, 0, 0);

  const { data } = await db(supabase)
    .from("appointments")
    .select("price_cents")
    .eq("provider_id", providerId)
    .eq("status", "completed")
    .gte("start_time", thirtyDaysAgo.toISOString());

  if (!data) return 0;

  return (data as { price_cents: number }[]).reduce(
    (sum, row) => sum + row.price_cents,
    0
  );
}

export async function getProviderReviews(
  supabase: TypedSupabaseClient,
  providerId: string
): Promise<ReviewWithUser[]> {
  const { data: reviews } = await db(supabase)
    .from("reviews")
    .select("id, provider_id, user_id, appointment_id, rating, comment, created_at")
    .eq("provider_id", providerId)
    .order("created_at", { ascending: false });

  if (!reviews || reviews.length === 0) return [];

  const userIds = [...new Set((reviews as ReviewRow[]).map((r) => r.user_id))];

  // Use public_profiles view (exposes only id + full_name) instead of the
  // profiles table directly, so we don't require broad RLS on profiles.
  const { data: profiles } = await db(supabase)
    .from("public_profiles")
    .select("id, full_name")
    .in("id", userIds);

  const profileMap = new Map<string, string | null>();
  if (profiles) {
    for (const p of profiles as Pick<ProfileRow, "id" | "full_name">[]) {
      profileMap.set(p.id, p.full_name);
    }
  }

  return (reviews as ReviewRow[]).map((r) => ({
    ...r,
    user_full_name: profileMap.get(r.user_id) ?? null,
  }));
}
