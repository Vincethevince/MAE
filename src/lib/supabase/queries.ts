import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";

type TypedSupabaseClient = SupabaseClient<Database>;
type ProviderRow = Database["public"]["Tables"]["providers"]["Row"];
type ServiceRow = Database["public"]["Tables"]["services"]["Row"];
type AvailabilityRow = Database["public"]["Tables"]["availability"]["Row"];

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
