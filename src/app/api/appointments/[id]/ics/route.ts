import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAppointmentById } from "@/lib/supabase/queries";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Format a Date as a UTC iCalendar DTSTAMP/DTSTART/DTEND value: YYYYMMDDTHHMMSSZ */
function toIcsDateTime(date: Date): string {
  return date
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
}

/** Escape special characters in iCalendar text properties. */
function escapeIcsText(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "");
}

/** Fold iCalendar lines at 75 octets per RFC 5545 §3.1 */
function foldLine(line: string): string {
  const bytes = new TextEncoder().encode(line);
  if (bytes.length <= 75) return line;

  const parts: string[] = [];
  let pos = 0;
  let first = true;

  while (pos < bytes.length) {
    const limit = first ? 75 : 74; // first line 75, continuation 74 (1 for the space)
    // Find a safe UTF-8 boundary
    let end = pos + limit;
    if (end >= bytes.length) {
      end = bytes.length;
    } else {
      // Retreat to a valid UTF-8 boundary
      while (end > pos && (bytes[end] & 0xc0) === 0x80) end--;
    }
    const chunk = new TextDecoder().decode(bytes.slice(pos, end));
    parts.push(first ? chunk : " " + chunk);
    pos = end;
    first = false;
  }

  return parts.join("\r\n");
}

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

  // Only the customer who booked the appointment can download it
  if (appointment.user_id !== user.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
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
