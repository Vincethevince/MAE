"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import {
  businessProfileSchema,
  serviceSchema,
  availabilitySchema,
} from "@/lib/validations/provider";
import type { Database } from "@/types/database";

type ActionResult<T = undefined> =
  | { error: string; success?: never; data?: never }
  | (T extends undefined
      ? { success: true; error?: never }
      : { success: true; data: T; error?: never });

type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
type ProviderRow = Database["public"]["Tables"]["providers"]["Row"];

// supabase-js 2.100+ uses a newer internal schema format that doesn't match
// the hand-written Database type, so we cast where table queries are needed.
type Db = ReturnType<typeof createClient> extends Promise<infer C> ? C : never;

async function queryDb(supabase: Db) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return supabase as any;
}

interface AuthContext {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: any;
  profile: ProfileRow | null;
  provider: ProviderRow | null;
}

async function getAuthenticatedProvider(): Promise<AuthContext> {
  const supabase = await createClient();
  const db = await queryDb(supabase);

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { db, profile: null, provider: null };
  }

  const { data: profileData } = await db
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  const profile = profileData as ProfileRow | null;

  if (!profile || profile.role !== "provider") {
    return { db, profile: null, provider: null };
  }

  const { data: providerData } = await db
    .from("providers")
    .select("*")
    .eq("profile_id", user.id)
    .single();

  const provider = providerData as ProviderRow | null;

  return { db, profile, provider };
}

export async function createOrUpdateProvider(
  formData: FormData
): Promise<ActionResult<{ providerId: string }>> {
  const raw = {
    businessName: formData.get("businessName")?.toString() ?? "",
    address: formData.get("address")?.toString() ?? "",
    city: formData.get("city")?.toString() ?? "",
    postalCode: formData.get("postalCode")?.toString() ?? "",
    phone: formData.get("phone")?.toString() ?? "",
    category: formData.get("category")?.toString() ?? "",
    description: formData.get("description")?.toString() ?? "",
  };

  const parsed = businessProfileSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: "validationError" };
  }

  const supabase = await createClient();
  const db = await queryDb(supabase);

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: "unauthorized" };
  }

  const { data: profileData } = await db
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const profile = profileData as { role: string } | null;

  if (!profile || profile.role !== "provider") {
    return { error: "unauthorized" };
  }

  const { data: existingRaw } = await db
    .from("providers")
    .select("id")
    .eq("profile_id", user.id)
    .single();

  const existing = existingRaw as { id: string } | null;

  if (existing) {
    const { error: updateError } = await db
      .from("providers")
      .update({
        business_name: parsed.data.businessName,
        address: parsed.data.address,
        city: parsed.data.city,
        postal_code: parsed.data.postalCode,
        phone: parsed.data.phone ?? null,
        category: parsed.data.category,
        description: parsed.data.description ?? null,
      })
      .eq("id", existing.id);

    if (updateError) {
      return { error: "saveFailed" };
    }

    return { success: true, data: { providerId: existing.id } };
  }

  const { data: created, error: insertError } = await db
    .from("providers")
    .insert({
      profile_id: user.id,
      business_name: parsed.data.businessName,
      address: parsed.data.address,
      city: parsed.data.city,
      postal_code: parsed.data.postalCode,
      phone: parsed.data.phone ?? null,
      category: parsed.data.category,
      description: parsed.data.description ?? null,
    })
    .select("id")
    .single();

  if (insertError || !created) {
    return { error: "saveFailed" };
  }

  return { success: true, data: { providerId: (created as { id: string }).id } };
}

export async function addService(
  formData: FormData
): Promise<ActionResult<{ serviceId: string }>> {
  const raw = {
    name: formData.get("name")?.toString() ?? "",
    description: formData.get("description")?.toString() ?? "",
    durationMinutes: formData.get("durationMinutes")?.toString() ?? "",
    priceCents: formData.get("priceCents")?.toString() ?? "",
    category: formData.get("category")?.toString() ?? "",
  };

  const parsed = serviceSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: "validationError" };
  }

  const { db, profile, provider } = await getAuthenticatedProvider();

  if (!profile) {
    return { error: "unauthorized" };
  }

  if (!provider) {
    return { error: "providerNotFound" };
  }

  const { data: created, error: insertError } = await db
    .from("services")
    .insert({
      provider_id: provider.id,
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      duration_minutes: parsed.data.durationMinutes,
      price_cents: parsed.data.priceCents,
      category: parsed.data.category,
    })
    .select("id")
    .single();

  if (insertError || !created) {
    return { error: "saveFailed" };
  }

  return { success: true, data: { serviceId: (created as { id: string }).id } };
}

export async function updateService(
  formData: FormData
): Promise<ActionResult> {
  const serviceId = formData.get("serviceId")?.toString() ?? "";

  const raw = {
    name: formData.get("name")?.toString() ?? "",
    description: formData.get("description")?.toString() ?? "",
    durationMinutes: formData.get("durationMinutes")?.toString() ?? "",
    priceCents: formData.get("priceCents")?.toString() ?? "",
    category: formData.get("category")?.toString() ?? "",
  };

  if (!serviceId) {
    return { error: "validationError" };
  }

  const parsed = serviceSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: "validationError" };
  }

  const { db, profile, provider } = await getAuthenticatedProvider();

  if (!profile) {
    return { error: "unauthorized" };
  }

  if (!provider) {
    return { error: "providerNotFound" };
  }

  const { data: serviceData } = await db
    .from("services")
    .select("provider_id")
    .eq("id", serviceId)
    .single();

  const service = serviceData as { provider_id: string } | null;

  if (!service || service.provider_id !== provider.id) {
    return { error: "unauthorized" };
  }

  const { error: updateError } = await db
    .from("services")
    .update({
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      duration_minutes: parsed.data.durationMinutes,
      price_cents: parsed.data.priceCents,
      category: parsed.data.category,
    })
    .eq("id", serviceId);

  if (updateError) {
    return { error: "saveFailed" };
  }

  return { success: true };
}

export async function deleteService(
  formData: FormData
): Promise<ActionResult> {
  const serviceId = formData.get("serviceId")?.toString() ?? "";

  if (!serviceId) {
    return { error: "validationError" };
  }

  const { db, profile, provider } = await getAuthenticatedProvider();

  if (!profile) {
    return { error: "unauthorized" };
  }

  if (!provider) {
    return { error: "providerNotFound" };
  }

  const { data: serviceData } = await db
    .from("services")
    .select("provider_id")
    .eq("id", serviceId)
    .single();

  const service = serviceData as { provider_id: string } | null;

  if (!service || service.provider_id !== provider.id) {
    return { error: "unauthorized" };
  }

  const { error: updateError } = await db
    .from("services")
    .update({ is_active: false })
    .eq("id", serviceId);

  if (updateError) {
    return { error: "deleteFailed" };
  }

  return { success: true };
}

export async function setAvailability(
  formData: FormData
): Promise<ActionResult> {
  const raw = {
    dayOfWeek: formData.get("dayOfWeek")?.toString() ?? "",
    startTime: formData.get("startTime")?.toString() ?? "",
    endTime: formData.get("endTime")?.toString() ?? "",
  };

  const parsed = availabilitySchema.safeParse(raw);
  if (!parsed.success) {
    return { error: "validationError" };
  }

  const { db, profile, provider } = await getAuthenticatedProvider();

  if (!profile) {
    return { error: "unauthorized" };
  }

  if (!provider) {
    return { error: "providerNotFound" };
  }

  const { error: deleteError } = await db
    .from("availability")
    .delete()
    .eq("provider_id", provider.id)
    .eq("day_of_week", parsed.data.dayOfWeek)
    .is("employee_id", null);

  if (deleteError) {
    return { error: "saveFailed" };
  }

  const { error: insertError } = await db.from("availability").insert({
    provider_id: provider.id,
    day_of_week: parsed.data.dayOfWeek,
    start_time: parsed.data.startTime,
    end_time: parsed.data.endTime,
  });

  if (insertError) {
    return { error: "saveFailed" };
  }

  return { success: true };
}

export async function completeOnboarding(): Promise<never> {
  redirect("/dashboard");
}
