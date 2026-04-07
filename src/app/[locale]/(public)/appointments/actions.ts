"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { reviewSchema } from "@/lib/validations/booking";
import {
  sendCancellationByCustomer,
  sendProviderCancellationAlert,
} from "@/lib/email";
import type { Database } from "@/types/database";

type ActionResult = { error: string } | { success: true };
type AppointmentRow = Database["public"]["Tables"]["appointments"]["Row"];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function queryDb(supabase: any): Promise<any> {
  return supabase;
}

export async function cancelAppointment(formData: FormData): Promise<ActionResult> {
  const appointmentId = formData.get("appointmentId")?.toString() ?? "";
  const locale = formData.get("locale")?.toString() ?? "de";

  if (!appointmentId) {
    return { error: "notFound" };
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

  const { data: apptData } = await db
    .from("appointments")
    .select("id, user_id, status, start_time, provider_id, service_id")
    .eq("id", appointmentId)
    .single();

  const appt = apptData as Pick<
    AppointmentRow,
    "id" | "user_id" | "status" | "start_time" | "provider_id" | "service_id"
  > | null;

  if (!appt) {
    return { error: "notFound" };
  }

  if (appt.user_id !== user.id) {
    return { error: "unauthorized" };
  }

  if (appt.status !== "pending" && appt.status !== "confirmed") {
    return { error: "cannotCancel" };
  }

  // Enforce 24-hour cancellation cutoff
  const hoursUntilStart = (new Date(appt.start_time).getTime() - Date.now()) / (1000 * 60 * 60);
  if (hoursUntilStart < 24) {
    return { error: "cancelTooLate" };
  }

  const { error: updateError } = await db
    .from("appointments")
    .update({ status: "cancelled" })
    .eq("id", appointmentId)
    .eq("user_id", user.id); // Defence-in-depth: re-assert ownership in DB WHERE clause

  if (updateError) {
    return { error: "cancelFailed" };
  }

  const safeLocale = ["de", "en"].includes(locale) ? locale : "de";
  revalidatePath(`/${safeLocale}/appointments`);

  // Send email notifications — non-blocking (sendEmail never throws)
  // Fetch service + provider + customer data in parallel
  const [serviceResult, providerResult, customerResult] = await Promise.allSettled([
    db.from("services").select("name").eq("id", appt.service_id).single(),
    db.from("providers").select("business_name, address, city, profile_id").eq("id", appt.provider_id).single(),
    db.from("profiles").select("full_name").eq("id", user.id).single(),
  ]);

  const serviceName =
    serviceResult.status === "fulfilled"
      ? (serviceResult.value.data as { name?: string } | null)?.name ?? "Service"
      : "Service";

  const providerData =
    providerResult.status === "fulfilled"
      ? (providerResult.value.data as {
          business_name?: string;
          address?: string | null;
          city?: string | null;
          profile_id?: string;
        } | null)
      : null;

  const customerName =
    customerResult.status === "fulfilled"
      ? (customerResult.value.data as { full_name?: string } | null)?.full_name ?? null
      : null;

  const emailDetails = {
    appointmentId,
    businessName: providerData?.business_name ?? "",
    serviceName,
    startTime: appt.start_time,
    address: providerData?.address && providerData?.city
      ? `${providerData.address}, ${providerData.city}`
      : providerData?.address ?? null,
    customerName,
  };

  // Fetch provider email via their profile_id
  const providerProfileId = providerData?.profile_id;
  const providerEmailResult = providerProfileId
    ? await db.from("profiles").select("email").eq("id", providerProfileId).single()
    : null;
  const providerEmail =
    (providerEmailResult?.data as { email?: string } | null)?.email ?? null;

  await Promise.all([
    user.email
      ? sendCancellationByCustomer(user.email, emailDetails)
      : Promise.resolve(),
    providerEmail
      ? sendProviderCancellationAlert(providerEmail, emailDetails)
      : Promise.resolve(),
  ]);

  return { success: true };
}

export async function submitReview(formData: FormData): Promise<ActionResult> {
  const raw = {
    appointmentId: formData.get("appointmentId")?.toString() ?? "",
    rating: formData.get("rating")?.toString() ?? "",
    comment: formData.get("comment")?.toString() ?? "",
  };

  const parsed = reviewSchema.safeParse(raw);
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

  const { data: apptData } = await db
    .from("appointments")
    .select("id, user_id, status, provider_id")
    .eq("id", parsed.data.appointmentId)
    .single();

  const appt = apptData as Pick<
    AppointmentRow,
    "id" | "user_id" | "status" | "provider_id"
  > | null;

  if (!appt) {
    return { error: "notFound" };
  }

  if (appt.user_id !== user.id) {
    return { error: "unauthorized" };
  }

  if (appt.status !== "completed") {
    return { error: "notCompleted" };
  }

  // Prevent duplicate reviews (belt-and-suspenders: RLS also enforces this)
  const { data: existingReview } = await db
    .from("reviews")
    .select("id")
    .eq("appointment_id", parsed.data.appointmentId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existingReview) {
    return { error: "alreadyReviewed" };
  }

  const { error: insertError } = await db.from("reviews").insert({
    appointment_id: parsed.data.appointmentId,
    provider_id: appt.provider_id,
    user_id: user.id,
    rating: parsed.data.rating,
    comment: parsed.data.comment || null,
  });

  if (insertError) {
    // 23505 = unique_violation: duplicate review for this appointment
    if ((insertError as { code?: string }).code === "23505") {
      return { error: "alreadyReviewed" };
    }
    return { error: "saveFailed" };
  }

  const rawLocale = formData.get("locale")?.toString() ?? "de";
  const locale = ["de", "en"].includes(rawLocale) ? rawLocale : "de";
  revalidatePath(`/${locale}/appointments`);
  return { success: true };
}
