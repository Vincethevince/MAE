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
import {
  sendBookingConfirmation,
  sendProviderNewBooking,
} from "@/lib/email";
import type { Database } from "@/types/database";

type ActionResult =
  | { error: string; appointmentId?: never }
  | { error?: never; appointmentId: string };

const VALID_LOCALES = ["de", "en"] as const;
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;

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

  // Check provider blocks
  const { data: blockData } = await db
    .from("provider_blocks")
    .select("start_time, end_time")
    .eq("provider_id", service.provider_id)
    .lt("start_time", requestedEnd.toISOString())
    .gt("end_time", requestedStart.toISOString());

  const hasBlockConflict = (blockData ?? []).length > 0;
  if (hasBlockConflict) {
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

  // Send email notifications (non-blocking — never fail the booking on email error)
  const emailDetails = {
    appointmentId,
    businessName: provider.business_name,
    serviceName: service.name,
    startTime: requestedStart.toISOString(),
    address: provider.address && provider.city
      ? `${provider.address}, ${provider.city}`
      : provider.address ?? null,
  };

  // Fetch customer name and provider email in parallel for notifications
  const [customerProfileResult, providerProfileResult] = await Promise.allSettled([
    db
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .single(),
    db
      .from("profiles")
      .select("email")
      .eq("id", provider.profile_id)
      .single(),
  ]);

  const customerName =
    customerProfileResult.status === "fulfilled"
      ? (customerProfileResult.value.data as { full_name?: string } | null)?.full_name ?? null
      : null;

  const providerEmail =
    providerProfileResult.status === "fulfilled"
      ? (providerProfileResult.value.data as { email?: string } | null)?.email ?? null
      : null;

  // Send emails — awaited to ensure delivery on serverless (sendEmail never throws)
  await Promise.all([
    user.email
      ? sendBookingConfirmation(user.email, { ...emailDetails, customerName })
      : Promise.resolve(),
    providerEmail
      ? sendProviderNewBooking(providerEmail, { ...emailDetails, customerName })
      : Promise.resolve(),
  ]);

  return { appointmentId };
}

export async function confirmAndRedirect(formData: FormData): Promise<never> {
  const rawLocale = formData.get("locale")?.toString() ?? "de";
  const safeLocale = VALID_LOCALES.includes(rawLocale as typeof VALID_LOCALES[number])
    ? rawLocale
    : "de";

  const result = await createAppointment(formData);

  if (result.error) {
    // Validate UUIDs before embedding in the redirect path to prevent path traversal
    const rawProviderId = formData.get("providerId")?.toString() ?? "";
    const rawServiceId = formData.get("serviceId")?.toString() ?? "";
    if (!UUID_REGEX.test(rawProviderId) || !UUID_REGEX.test(rawServiceId)) {
      redirect(`/${safeLocale}/search`);
    }
    redirect(
      `/${safeLocale}/book/${rawProviderId}/${rawServiceId}/confirm?startTime=${encodeURIComponent(formData.get("startTime")?.toString() ?? "")}&error=${result.error}`
    );
  }

  // Validate appointmentId is a UUID before embedding in URL (defensive; Postgres always returns a UUID)
  const appointmentId = result.appointmentId as string;
  if (!UUID_REGEX.test(appointmentId)) {
    redirect(`/${safeLocale}/search`);
  }
  redirect(`/${safeLocale}/book/success?appointmentId=${appointmentId}`);
}
