"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { bookingSchema } from "@/lib/validations/booking";
import {
  getProviderById,
  getServiceById,
  getAppointmentsForDate,
} from "@/lib/supabase/queries";
import { computeAvailableSlots } from "@/lib/booking";
import type { Database } from "@/types/database";

type ActionResult =
  | { error: string; appointmentId?: never }
  | { error?: never; appointmentId: string };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function queryDb(supabase: any): Promise<any> {
  return supabase;
}

type AppointmentRow = Database["public"]["Tables"]["appointments"]["Row"];

export async function createAppointment(
  formData: FormData
): Promise<ActionResult> {
  const raw = {
    providerId: formData.get("providerId")?.toString() ?? "",
    serviceId: formData.get("serviceId")?.toString() ?? "",
    startTime: formData.get("startTime")?.toString() ?? "",
    notes: formData.get("notes")?.toString() ?? undefined,
  };

  // Validate input with Zod
  const parsed = bookingSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: "validationError" };
  }

  const { providerId, serviceId, startTime, notes } = parsed.data;

  const supabase = await createClient();
  const db = await queryDb(supabase);

  // Require authenticated user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: "unauthorized" };
  }

  // Validate provider exists
  const provider = await getProviderById(supabase, providerId);
  if (!provider) {
    return { error: "providerNotFound" };
  }

  // Validate service exists and belongs to provider
  const service = await getServiceById(supabase, serviceId);
  if (!service || service.provider_id !== providerId) {
    return { error: "serviceNotFound" };
  }

  // Re-validate that the requested slot is actually available (server-side)
  const requestedStart = new Date(startTime);
  const requestedEnd = new Date(
    requestedStart.getTime() + service.duration_minutes * 60_000
  );

  // Fetch existing appointments for that date
  const existingAppointments = await getAppointmentsForDate(
    supabase,
    providerId,
    requestedStart
  );

  // Compute available slots and check the requested one is among them
  const availableSlots = computeAvailableSlots(
    requestedStart,
    provider.availability,
    existingAppointments,
    service.duration_minutes
  );

  const isSlotAvailable = availableSlots.some(
    (slot) =>
      slot.startTime.getTime() === requestedStart.getTime()
  );

  if (!isSlotAvailable) {
    return { error: "slotNotAvailable" };
  }

  // Double-booking prevention: check for overlapping appointments at that exact time
  const hasConflict = (existingAppointments as AppointmentRow[]).some((appt) => {
    const apptStart = new Date(appt.start_time);
    const apptEnd = new Date(appt.end_time);
    return requestedStart < apptEnd && apptStart < requestedEnd;
  });

  if (hasConflict) {
    return { error: "slotNotAvailable" };
  }

  // Price comes from service record, never from the client
  const priceCents = service.price_cents;

  const { data: created, error: insertError } = await db
    .from("appointments")
    .insert({
      user_id: user.id,
      provider_id: providerId,
      service_id: serviceId,
      employee_id: null,
      start_time: requestedStart.toISOString(),
      end_time: requestedEnd.toISOString(),
      status: "pending",
      notes: notes ?? null,
      price_cents: priceCents,
    })
    .select("id")
    .single();

  if (insertError || !created) {
    return { error: "bookingFailed" };
  }

  const appointmentId = (created as { id: string }).id;
  return { appointmentId };
}

export async function confirmAndRedirect(formData: FormData): Promise<never> {
  const locale = formData.get("locale")?.toString() ?? "de";

  const result = await createAppointment(formData);

  if (result.error) {
    redirect(
      `/${locale}/book/${formData.get("providerId")}/${formData.get("serviceId")}/confirm?startTime=${encodeURIComponent(formData.get("startTime")?.toString() ?? "")}&error=${result.error}`
    );
  }

  redirect(`/${locale}/book/success?appointmentId=${result.appointmentId}`);
}
