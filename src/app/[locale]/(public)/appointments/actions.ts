"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
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
