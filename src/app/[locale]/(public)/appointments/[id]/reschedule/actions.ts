"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import {
  getProviderById,
  getAppointmentsForDate,
  getProviderBlocksForDateRange,
} from "@/lib/supabase/queries";
import { computeAvailableSlots } from "@/lib/booking";
import type { BlockInterval } from "@/lib/booking";
import {
  sendRescheduleConfirmation,
  sendProviderRescheduleAlert,
} from "@/lib/email";
import type { Database } from "@/types/database";

type ActionResult = { error: string } | { success: true };
type AppointmentRow = Database["public"]["Tables"]["appointments"]["Row"];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function queryDb(supabase: any): Promise<any> {
  return supabase;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function rescheduleAppointment(formData: FormData): Promise<ActionResult> {
  const appointmentId = formData.get("appointmentId")?.toString() ?? "";
  const newStartTime = formData.get("newStartTime")?.toString() ?? "";
  const locale = formData.get("locale")?.toString() ?? "de";

  // 1. UUID validation
  if (!UUID_RE.test(appointmentId)) {
    return { error: "notFound" };
  }

  const supabase = await createClient();
  const db = await queryDb(supabase);

  // 2. Auth check
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: "unauthorized" };
  }

  // 3. Fetch appointment and check ownership
  const { data: apptData } = await db
    .from("appointments")
    .select("id, user_id, status, start_time, end_time, provider_id, service_id")
    .eq("id", appointmentId)
    .single();

  const appt = apptData as Pick<
    AppointmentRow,
    "id" | "user_id" | "status" | "start_time" | "end_time" | "provider_id" | "service_id"
  > | null;

  if (!appt) {
    return { error: "notFound" };
  }

  if (appt.user_id !== user.id) {
    return { error: "unauthorized" };
  }

  // 4. Check status is pending or confirmed
  if (appt.status !== "pending" && appt.status !== "confirmed") {
    return { error: "cannotReschedule" };
  }

  // 5. Enforce 24h cutoff from current start_time
  const hoursUntilStart = (new Date(appt.start_time).getTime() - Date.now()) / (1000 * 60 * 60);
  if (hoursUntilStart < 24) {
    return { error: "rescheduleTooLate" };
  }

  // 6. Validate newStartTime is a valid ISO date at least 1h in the future
  const newStart = new Date(newStartTime);
  if (isNaN(newStart.getTime())) {
    return { error: "invalidSlot" };
  }
  const hoursUntilNewStart = (newStart.getTime() - Date.now()) / (1000 * 60 * 60);
  if (hoursUntilNewStart < 1) {
    return { error: "invalidSlot" };
  }

  // 7. Verify the new slot is available
  // Fetch service to get duration
  const { data: serviceData } = await db
    .from("services")
    .select("duration_minutes")
    .eq("id", appt.service_id)
    .single();

  const durationMinutes = (serviceData as { duration_minutes?: number } | null)?.duration_minutes ?? 60;
  const newEndTime = new Date(newStart.getTime() + durationMinutes * 60_000);

  // Fetch existing appointments for provider on new slot's date (excluding current appt)
  const slotDate = new Date(newStart);
  slotDate.setHours(0, 0, 0, 0);

  const existingAppointments = await getAppointmentsForDate(supabase, appt.provider_id, slotDate);

  // Exclude the current appointment being rescheduled
  const filteredAppointments = existingAppointments.filter((a) => a.id !== appointmentId);

  // Check for overlap manually: any non-cancelled appointment that overlaps the new slot
  const overlaps = filteredAppointments.some((a) => {
    const aStart = new Date(a.start_time).getTime();
    const aEnd = new Date(a.end_time).getTime();
    const nStart = newStart.getTime();
    const nEnd = newEndTime.getTime();
    return aStart < nEnd && aEnd > nStart;
  });

  if (overlaps) {
    return { error: "slotUnavailable" };
  }

  // 8. Check provider blocks for the new date
  const slotDateEnd = new Date(slotDate);
  slotDateEnd.setHours(23, 59, 59, 999);

  const allBlocks = await getProviderBlocksForDateRange(
    supabase,
    appt.provider_id,
    slotDate,
    slotDateEnd
  );

  const dayBlocks: BlockInterval[] = allBlocks.filter((b) => {
    const bStart = new Date(b.start_time);
    const bEnd = new Date(b.end_time);
    return bStart < slotDateEnd && bEnd > slotDate;
  });

  // Verify the slot actually appears in computeAvailableSlots (validates against availability + blocks)
  // Fetch provider to get availability
  const provider = await getProviderById(supabase, appt.provider_id);
  if (!provider) {
    return { error: "slotUnavailable" };
  }

  const availableSlots = computeAvailableSlots(
    slotDate,
    provider.availability,
    filteredAppointments,
    durationMinutes,
    dayBlocks
  );

  const newStartISO = newStart.toISOString();
  const slotExists = availableSlots.some(
    (s) => s.startTime.toISOString() === newStartISO
  );

  if (!slotExists) {
    return { error: "slotUnavailable" };
  }

  // Update appointment
  const { error: updateError } = await db
    .from("appointments")
    .update({
      start_time: newStart.toISOString(),
      end_time: newEndTime.toISOString(),
      status: "pending",
      updated_at: new Date().toISOString(),
    })
    .eq("id", appointmentId)
    .eq("user_id", user.id); // Defence-in-depth: re-assert ownership in DB WHERE clause

  if (updateError) {
    return { error: "unknown" };
  }

  const safeLocale = ["de", "en"].includes(locale) ? locale : "de";
  revalidatePath(`/${safeLocale}/appointments`);

  // Fire-and-forget email notifications
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
    startTime: newStart.toISOString(),
    address:
      providerData?.address && providerData?.city
        ? `${providerData.address}, ${providerData.city}`
        : providerData?.address ?? null,
    customerName,
    oldStartTime: appt.start_time,
  };

  const providerProfileId = providerData?.profile_id;
  const providerEmailResult = providerProfileId
    ? await db.from("profiles").select("email").eq("id", providerProfileId).single()
    : null;
  const providerEmail =
    (providerEmailResult?.data as { email?: string } | null)?.email ?? null;

  await Promise.all([
    user.email
      ? sendRescheduleConfirmation(user.email, emailDetails, safeLocale)
      : Promise.resolve(),
    providerEmail
      ? sendProviderRescheduleAlert(providerEmail, { ...emailDetails, customerName })
      : Promise.resolve(),
  ]);

  return { success: true };
}
