import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";

type AvailabilityRow = Database["public"]["Tables"]["availability"]["Row"];
type AppointmentRow = Database["public"]["Tables"]["appointments"]["Row"];

export interface TimeSlot {
  startTime: Date;
  endTime: Date;
}

/**
 * Parse a time string (HH:MM or HH:MM:SS) and apply it to a date.
 */
function applyTimeToDate(date: Date, timeStr: string): Date {
  const [hoursStr, minutesStr] = timeStr.split(":");
  const hours = parseInt(hoursStr ?? "0", 10);
  const minutes = parseInt(minutesStr ?? "0", 10);
  const result = new Date(date);
  result.setHours(hours, minutes, 0, 0);
  return result;
}

/**
 * Check whether two time intervals overlap.
 * [aStart, aEnd) overlaps [bStart, bEnd) if aStart < bEnd && bStart < aEnd
 */
function intervalsOverlap(
  aStart: Date,
  aEnd: Date,
  bStart: Date,
  bEnd: Date
): boolean {
  return aStart < bEnd && bStart < aEnd;
}

/**
 * Compute available time slots for a given date.
 *
 * @param date - The date to compute slots for (time portion is ignored)
 * @param availability - All availability rows for the provider
 * @param existingAppointments - Non-cancelled appointments for the provider on this date
 * @param serviceDurationMinutes - Duration of the service in minutes
 * @returns Array of available { startTime, endTime } slot objects
 */
export function computeAvailableSlots(
  date: Date,
  availability: AvailabilityRow[],
  existingAppointments: AppointmentRow[],
  serviceDurationMinutes: number
): TimeSlot[] {
  // JS day of week: 0=Sunday … 6=Saturday
  const dayOfWeek = date.getDay();

  // Find availability windows for this day of week (provider-level only, no employee filter)
  const windows = availability.filter(
    (a) => a.day_of_week === dayOfWeek && a.employee_id === null
  );

  if (windows.length === 0) return [];

  const SLOT_INTERVAL_MINUTES = 15;
  const slots: TimeSlot[] = [];

  for (const window of windows) {
    const windowStart = applyTimeToDate(date, window.start_time);
    const windowEnd = applyTimeToDate(date, window.end_time);

    let cursor = new Date(windowStart);

    while (true) {
      const slotEnd = new Date(cursor.getTime() + serviceDurationMinutes * 60_000);

      // Slot must fit entirely within the availability window
      if (slotEnd > windowEnd) break;

      // Check against existing appointments
      const hasConflict = existingAppointments.some((appt) => {
        const apptStart = new Date(appt.start_time);
        const apptEnd = new Date(appt.end_time);
        return intervalsOverlap(cursor, slotEnd, apptStart, apptEnd);
      });

      if (!hasConflict) {
        slots.push({ startTime: new Date(cursor), endTime: new Date(slotEnd) });
      }

      cursor = new Date(cursor.getTime() + SLOT_INTERVAL_MINUTES * 60_000);
    }
  }

  return slots;
}

/**
 * Fetch all non-cancelled appointments for a provider on a specific date.
 */
export async function getExistingAppointments(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<Database> | any,
  providerId: string,
  date: Date
): Promise<AppointmentRow[]> {
  // Build date range for the given day (local midnight to next midnight UTC-safe approach)
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(date);
  dayEnd.setHours(23, 59, 59, 999);

  const { data } = await supabase
    .from("appointments")
    .select("*")
    .eq("provider_id", providerId)
    .neq("status", "cancelled")
    .gte("start_time", dayStart.toISOString())
    .lte("start_time", dayEnd.toISOString());

  return (data as AppointmentRow[] | null) ?? [];
}
