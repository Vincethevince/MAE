"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { reviewSchema } from "@/lib/validations/booking";
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
    .select("id, user_id, status")
    .eq("id", appointmentId)
    .single();

  const appt = apptData as Pick<AppointmentRow, "id" | "user_id" | "status"> | null;

  if (!appt) {
    return { error: "notFound" };
  }

  if (appt.user_id !== user.id) {
    return { error: "unauthorized" };
  }

  if (appt.status !== "pending" && appt.status !== "confirmed") {
    return { error: "cannotCancel" };
  }

  const { error: updateError } = await db
    .from("appointments")
    .update({ status: "cancelled" })
    .eq("id", appointmentId);

  if (updateError) {
    return { error: "cancelFailed" };
  }

  revalidatePath(`/${locale}/appointments`);
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
