import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";

type TypedSupabaseClient = SupabaseClient<Database>;
type ProviderRow = Database["public"]["Tables"]["providers"]["Row"];
type ServiceRow = Database["public"]["Tables"]["services"]["Row"];
type AvailabilityRow = Database["public"]["Tables"]["availability"]["Row"];
type ReviewRow = Database["public"]["Tables"]["reviews"]["Row"];
type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];

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

export async function getProviderReviews(
  supabase: TypedSupabaseClient,
  providerId: string
): Promise<ReviewWithUser[]> {
  const { data: reviews } = await db(supabase)
    .from("reviews")
    .select("*")
    .eq("provider_id", providerId)
    .order("created_at", { ascending: false });

  if (!reviews || reviews.length === 0) return [];

  const userIds = [...new Set((reviews as ReviewRow[]).map((r) => r.user_id))];

  const { data: profiles } = await db(supabase)
    .from("profiles")
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
