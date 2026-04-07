import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAppointmentById } from "@/lib/supabase/queries";
import { toIcsDateTime, escapeIcsText, foldLine } from "@/lib/ics-utils";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  const { id } = await params;

  if (!UUID_REGEX.test(id)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const appointment = await getAppointmentById(supabase, id);

  if (!appointment) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Only the customer who booked the appointment can download it.
  // RLS already enforces this at the DB layer; this is defence-in-depth.
  // Return 404 (not 403) to avoid leaking that the UUID exists.
  if (appointment.user_id !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Do not generate ICS for cancelled appointments
  if (appointment.status === "cancelled") {
    return NextResponse.json({ error: "Appointment is cancelled" }, { status: 410 });
  }

  const startDate = new Date(appointment.start_time);
  const endDate = new Date(appointment.end_time);
  const now = new Date();

  const summary = escapeIcsText(
    `${appointment.service.name} – ${appointment.provider.business_name}`
  );
  const location = escapeIcsText(
    appointment.provider.address
      ? `${appointment.provider.address}, ${appointment.provider.city ?? ""}`.trim().replace(/,\s*$/, "")
      : appointment.provider.city ?? ""
  );
  const description = escapeIcsText(
    `Buchung über MAE – Make Appointments Easier\nhttps://makeappointmentseasier.com`
  );
  const uid = `${appointment.id}@makeappointmentseasier.com`;

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//MAE//Make Appointments Easier//DE",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${toIcsDateTime(now)}`,
    `DTSTART:${toIcsDateTime(startDate)}`,
    `DTEND:${toIcsDateTime(endDate)}`,
    `SUMMARY:${summary}`,
    ...(location ? [`LOCATION:${location}`] : []),
    `DESCRIPTION:${description}`,
    "STATUS:CONFIRMED",
    "END:VEVENT",
    "END:VCALENDAR",
  ];

  const icsContent = lines.map(foldLine).join("\r\n") + "\r\n";

  const filename = `termin-${appointment.id.slice(0, 8)}.ics`;

  return new NextResponse(icsContent, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
