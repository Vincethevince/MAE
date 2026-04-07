"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import {
  businessProfileSchema,
  serviceSchema,
  availabilitySchema,
  employeeSchema,
} from "@/lib/validations/provider";
import {
  sendAppointmentConfirmed,
  sendCancellationByProvider,
} from "@/lib/email";
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
    website: formData.get("website")?.toString() ?? "",
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
    .select("id, category")
    .eq("profile_id", user.id)
    .single();

  const existing = existingRaw as { id: string; category: string } | null;

  if (existing) {
    const { error: updateError } = await db
      .from("providers")
      .update({
        business_name: parsed.data.businessName,
        address: parsed.data.address,
        city: parsed.data.city,
        postal_code: parsed.data.postalCode,
        phone: parsed.data.phone ?? null,
        // category is immutable after creation — always use the stored value
        category: existing.category,
        description: parsed.data.description ?? null,
        website: parsed.data.website ?? null,
      })
      .eq("id", existing.id)
      .eq("profile_id", user.id);

    if (updateError) {
      return { error: "saveFailed" };
    }

    const { revalidatePath } = await import("next/cache");
    revalidatePath(`/provider/${existing.id}`);

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
      website: parsed.data.website ?? null,
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
    .eq("id", serviceId)
    .eq("provider_id", provider.id);

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
    .eq("id", serviceId)
    .eq("provider_id", provider.id);

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

export async function deleteAvailability(
  formData: FormData
): Promise<ActionResult> {
  const { db, profile, provider } = await getAuthenticatedProvider();

  if (!profile) {
    return { error: "unauthorized" };
  }

  if (!provider) {
    return { error: "providerNotFound" };
  }

  const dayOfWeekRaw = formData.get("dayOfWeek")?.toString() ?? "";
  const dayOfWeek = parseInt(dayOfWeekRaw, 10);

  if (isNaN(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6) {
    return { error: "validationError" };
  }

  const { error: deleteError } = await db
    .from("availability")
    .delete()
    .eq("provider_id", provider.id)
    .eq("day_of_week", dayOfWeek)
    .is("employee_id", null);

  if (deleteError) {
    return { error: "saveFailed" };
  }

  return { success: true };
}

export async function addEmployee(
  formData: FormData
): Promise<ActionResult<{ employeeId: string }>> {
  const { db, profile, provider } = await getAuthenticatedProvider();

  if (!profile) {
    return { error: "unauthorized" };
  }

  if (!provider) {
    return { error: "providerNotFound" };
  }

  const raw = {
    name: formData.get("name")?.toString() ?? "",
  };

  const parsed = employeeSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: "validationError" };
  }

  const { data: created, error: insertError } = await db
    .from("employees")
    .insert({
      provider_id: provider.id,
      name: parsed.data.name,
    })
    .select("id")
    .single();

  if (insertError || !created) {
    return { error: "saveFailed" };
  }

  return { success: true, data: { employeeId: (created as { id: string }).id } };
}

export async function updateEmployee(
  formData: FormData
): Promise<ActionResult> {
  const { db, profile, provider } = await getAuthenticatedProvider();

  if (!profile) {
    return { error: "unauthorized" };
  }

  if (!provider) {
    return { error: "providerNotFound" };
  }

  const employeeId = formData.get("employeeId")?.toString() ?? "";
  if (!employeeId || !/^[0-9a-f-]{36}$/i.test(employeeId)) {
    return { error: "validationError" };
  }

  const raw = {
    name: formData.get("name")?.toString() ?? "",
  };

  const parsed = employeeSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: "validationError" };
  }

  const { data: employeeData } = await db
    .from("employees")
    .select("provider_id")
    .eq("id", employeeId)
    .single();

  const employee = employeeData as { provider_id: string } | null;

  if (!employee || employee.provider_id !== provider.id) {
    return { error: "unauthorized" };
  }

  const { error: updateError } = await db
    .from("employees")
    .update({ name: parsed.data.name })
    .eq("id", employeeId)
    .eq("provider_id", provider.id);

  if (updateError) {
    return { error: "saveFailed" };
  }

  return { success: true };
}

export async function deactivateEmployee(
  formData: FormData
): Promise<ActionResult> {
  const { db, profile, provider } = await getAuthenticatedProvider();

  if (!profile) {
    return { error: "unauthorized" };
  }

  if (!provider) {
    return { error: "providerNotFound" };
  }

  const employeeId = formData.get("employeeId")?.toString() ?? "";
  if (!employeeId) {
    return { error: "validationError" };
  }

  const { data: employeeData } = await db
    .from("employees")
    .select("provider_id")
    .eq("id", employeeId)
    .single();

  const employee = employeeData as { provider_id: string } | null;

  if (!employee || employee.provider_id !== provider.id) {
    return { error: "unauthorized" };
  }

  const { error: updateError } = await db
    .from("employees")
    .update({ is_active: false })
    .eq("id", employeeId)
    .eq("provider_id", provider.id);

  if (updateError) {
    return { error: "deleteFailed" };
  }

  return { success: true };
}

export async function setEmployeeAvailability(
  formData: FormData
): Promise<ActionResult> {
  const { db, profile, provider } = await getAuthenticatedProvider();

  if (!profile) {
    return { error: "unauthorized" };
  }

  if (!provider) {
    return { error: "providerNotFound" };
  }

  const employeeId = formData.get("employeeId")?.toString() ?? "";
  if (!employeeId) {
    return { error: "validationError" };
  }

  const raw = {
    dayOfWeek: formData.get("dayOfWeek")?.toString() ?? "",
    startTime: formData.get("startTime")?.toString() ?? "",
    endTime: formData.get("endTime")?.toString() ?? "",
  };

  const parsed = availabilitySchema.safeParse(raw);
  if (!parsed.success) {
    return { error: "validationError" };
  }

  const { data: employeeData } = await db
    .from("employees")
    .select("provider_id")
    .eq("id", employeeId)
    .single();

  const employee = employeeData as { provider_id: string } | null;

  if (!employee || employee.provider_id !== provider.id) {
    return { error: "unauthorized" };
  }

  const { error: deleteError } = await db
    .from("availability")
    .delete()
    .eq("provider_id", provider.id)
    .eq("employee_id", employeeId)
    .eq("day_of_week", parsed.data.dayOfWeek);

  if (deleteError) {
    return { error: "saveFailed" };
  }

  const { error: insertError } = await db.from("availability").insert({
    provider_id: provider.id,
    employee_id: employeeId,
    day_of_week: parsed.data.dayOfWeek,
    start_time: parsed.data.startTime,
    end_time: parsed.data.endTime,
  });

  if (insertError) {
    return { error: "saveFailed" };
  }

  return { success: true };
}

export async function deleteEmployeeAvailability(
  formData: FormData
): Promise<ActionResult> {
  const { db, profile, provider } = await getAuthenticatedProvider();

  if (!profile) {
    return { error: "unauthorized" };
  }

  if (!provider) {
    return { error: "providerNotFound" };
  }

  const employeeId = formData.get("employeeId")?.toString() ?? "";
  if (!employeeId) {
    return { error: "validationError" };
  }

  const dayOfWeekRaw = formData.get("dayOfWeek")?.toString() ?? "";
  const dayOfWeek = parseInt(dayOfWeekRaw, 10);

  if (isNaN(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6) {
    return { error: "validationError" };
  }

  const { data: employeeData } = await db
    .from("employees")
    .select("provider_id")
    .eq("id", employeeId)
    .single();

  const employee = employeeData as { provider_id: string } | null;

  if (!employee || employee.provider_id !== provider.id) {
    return { error: "unauthorized" };
  }

  const { error: deleteError } = await db
    .from("availability")
    .delete()
    .eq("provider_id", provider.id)
    .eq("employee_id", employeeId)
    .eq("day_of_week", dayOfWeek);

  if (deleteError) {
    return { error: "saveFailed" };
  }

  return { success: true };
}

export async function completeOnboarding(): Promise<never> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  redirect("/dashboard");
}

type AppointmentActionResult = { error: string } | { success: true };
type AppointmentRow = Database["public"]["Tables"]["appointments"]["Row"];

async function getProviderForAppointment(
  appointmentId: string
): Promise<{
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: any;
  provider: ProviderRow | null;
  appt: Pick<AppointmentRow, "id" | "provider_id" | "status" | "start_time" | "user_id" | "service_id"> | null;
}> {
  const supabase = await createClient();
  const db = await queryDb(supabase);

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { db, provider: null, appt: null };
  }

  const { data: providerData } = await db
    .from("providers")
    .select("*")
    .eq("profile_id", user.id)
    .single();

  const provider = providerData as ProviderRow | null;

  if (!provider) {
    return { db, provider: null, appt: null };
  }

  const { data: apptData } = await db
    .from("appointments")
    .select("id, provider_id, status, start_time, user_id, service_id")
    .eq("id", appointmentId)
    .single();

  const appt = apptData as Pick<
    AppointmentRow,
    "id" | "provider_id" | "status" | "start_time" | "user_id" | "service_id"
  > | null;

  return { db, provider, appt };
}

/** Fetches customer email + customer name + service name for email notifications. */
async function fetchEmailData(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: any,
  appt: Pick<AppointmentRow, "user_id" | "service_id">
): Promise<{ customerEmail: string | null; customerName: string | null; serviceName: string }> {
  const [customerProfileResult, serviceResult] = await Promise.allSettled([
    db.from("profiles").select("email, full_name").eq("id", appt.user_id).single(),
    db.from("services").select("name").eq("id", appt.service_id).single(),
  ]);

  const customerProfile =
    customerProfileResult.status === "fulfilled"
      ? (customerProfileResult.value.data as { email?: string; full_name?: string } | null)
      : null;

  const serviceName =
    serviceResult.status === "fulfilled"
      ? (serviceResult.value.data as { name?: string } | null)?.name ?? "Service"
      : "Service";

  return {
    customerEmail: customerProfile?.email ?? null,
    customerName: customerProfile?.full_name ?? null,
    serviceName,
  };
}

export async function confirmAppointment(
  formData: FormData
): Promise<AppointmentActionResult> {
  const appointmentId = formData.get("appointmentId")?.toString() ?? "";
  const locale = formData.get("locale")?.toString() ?? "de";

  if (!appointmentId) {
    return { error: "notFound" };
  }

  const { db, provider, appt } = await getProviderForAppointment(appointmentId);

  if (!provider) {
    return { error: "unauthorized" };
  }

  if (!appt) {
    return { error: "notFound" };
  }

  if (appt.provider_id !== provider.id) {
    return { error: "unauthorized" };
  }

  if (appt.status !== "pending") {
    return { error: "invalidStatus" };
  }

  const { error: updateError } = await db
    .from("appointments")
    .update({ status: "confirmed" })
    .eq("id", appointmentId)
    .eq("provider_id", provider.id); // Defence-in-depth: re-assert ownership in DB WHERE clause

  if (updateError) {
    return { error: "actionFailed" };
  }

  const { revalidatePath } = await import("next/cache");
  const safeLocale = ["de", "en"].includes(locale) ? locale : "de";
  revalidatePath(`/${safeLocale}/dashboard/calendar`);

  // Send confirmation email to customer (never throws)
  const { customerEmail, customerName, serviceName } = await fetchEmailData(db, appt);
  if (customerEmail) {
    await sendAppointmentConfirmed(customerEmail, {
      appointmentId,
      businessName: provider.business_name,
      serviceName,
      startTime: appt.start_time,
      address: provider.address && provider.city
        ? `${provider.address}, ${provider.city}`
        : provider.address ?? null,
      customerName,
    });
  }

  return { success: true };
}

export async function cancelAppointmentAsProvider(
  formData: FormData
): Promise<AppointmentActionResult> {
  const appointmentId = formData.get("appointmentId")?.toString() ?? "";
  const locale = formData.get("locale")?.toString() ?? "de";

  if (!appointmentId) {
    return { error: "notFound" };
  }

  const { db, provider, appt } = await getProviderForAppointment(appointmentId);

  if (!provider) {
    return { error: "unauthorized" };
  }

  if (!appt) {
    return { error: "notFound" };
  }

  if (appt.provider_id !== provider.id) {
    return { error: "unauthorized" };
  }

  if (appt.status === "cancelled" || appt.status === "completed") {
    return { error: "invalidStatus" };
  }

  const { error: updateError } = await db
    .from("appointments")
    .update({ status: "cancelled" })
    .eq("id", appointmentId)
    .eq("provider_id", provider.id); // Defence-in-depth: re-assert ownership in DB WHERE clause

  if (updateError) {
    return { error: "actionFailed" };
  }

  const { revalidatePath } = await import("next/cache");
  const safeLocale = ["de", "en"].includes(locale) ? locale : "de";
  revalidatePath(`/${safeLocale}/dashboard/calendar`);

  // Send cancellation email to customer (never throws)
  const { customerEmail, customerName, serviceName } = await fetchEmailData(db, appt);
  if (customerEmail) {
    await sendCancellationByProvider(customerEmail, {
      appointmentId,
      businessName: provider.business_name,
      serviceName,
      startTime: appt.start_time,
      address: provider.address && provider.city
        ? `${provider.address}, ${provider.city}`
        : provider.address ?? null,
      customerName,
    });
  }

  return { success: true };
}

export async function markCompleted(
  formData: FormData
): Promise<AppointmentActionResult> {
  const appointmentId = formData.get("appointmentId")?.toString() ?? "";
  const locale = formData.get("locale")?.toString() ?? "de";

  if (!appointmentId) {
    return { error: "notFound" };
  }

  const { db, provider, appt } = await getProviderForAppointment(appointmentId);

  if (!provider) {
    return { error: "unauthorized" };
  }

  if (!appt) {
    return { error: "notFound" };
  }

  if (appt.provider_id !== provider.id) {
    return { error: "unauthorized" };
  }

  if (appt.status !== "confirmed") {
    return { error: "invalidStatus" };
  }

  if (new Date(appt.start_time) > new Date()) {
    return { error: "invalidStatus" };
  }

  const { error: updateError } = await db
    .from("appointments")
    .update({ status: "completed" })
    .eq("id", appointmentId)
    .eq("provider_id", provider.id); // Defence-in-depth

  if (updateError) {
    return { error: "actionFailed" };
  }

  const { revalidatePath } = await import("next/cache");
  const safeLocale = ["de", "en"].includes(locale) ? locale : "de";
  revalidatePath(`/${safeLocale}/dashboard/calendar`);
  return { success: true };
}

export async function markNoShow(
  formData: FormData
): Promise<AppointmentActionResult> {
  const appointmentId = formData.get("appointmentId")?.toString() ?? "";
  const locale = formData.get("locale")?.toString() ?? "de";

  if (!appointmentId) {
    return { error: "notFound" };
  }

  const { db, provider, appt } = await getProviderForAppointment(appointmentId);

  if (!provider) {
    return { error: "unauthorized" };
  }

  if (!appt) {
    return { error: "notFound" };
  }

  if (appt.provider_id !== provider.id) {
    return { error: "unauthorized" };
  }

  if (appt.status !== "pending" && appt.status !== "confirmed") {
    return { error: "invalidStatus" };
  }

  const apptStart = new Date(appt.start_time);
  if (apptStart > new Date()) {
    return { error: "invalidStatus" };
  }

  const { error: updateError } = await db
    .from("appointments")
    .update({ status: "no_show" })
    .eq("id", appointmentId)
    .eq("provider_id", provider.id); // Defence-in-depth

  if (updateError) {
    return { error: "actionFailed" };
  }

  const { revalidatePath } = await import("next/cache");
  const safeLocale = ["de", "en"].includes(locale) ? locale : "de";
  revalidatePath(`/${safeLocale}/dashboard/calendar`);
  return { success: true };
}

const UUID_REGEX_NOTES = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function saveProviderNote(formData: FormData): Promise<{ error: string } | { success: true }> {
  const appointmentId = formData.get("appointmentId")?.toString() ?? "";
  const noteRaw = formData.get("providerNote")?.toString() ?? "";
  const locale = formData.get("locale")?.toString() ?? "de";

  if (!UUID_REGEX_NOTES.test(appointmentId)) {
    return { error: "notFound" };
  }

  // Limit note length to 1000 characters
  const providerNote = noteRaw.slice(0, 1000);

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: "unauthorized" };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;

  // Verify the appointment belongs to this provider (defence-in-depth: also enforced by RLS)
  const { data: providerData } = await db
    .from("providers")
    .select("id")
    .eq("profile_id", user.id)
    .single();

  if (!providerData) {
    return { error: "unauthorized" };
  }

  const { error: updateError } = await db
    .from("appointments")
    .update({ provider_notes: providerNote || null })
    .eq("id", appointmentId)
    .eq("provider_id", providerData.id); // Defence-in-depth

  if (updateError) {
    return { error: "saveFailed" };
  }

  const { revalidatePath } = await import("next/cache");
  const safeLocale = ["de", "en"].includes(locale) ? locale : "de";
  revalidatePath(`/${safeLocale}/dashboard/calendar`);
  return { success: true };
}
